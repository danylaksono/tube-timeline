/*
  tube-timeline: London tube-style timeline renderer
  Public API:
    new TubeTimeline({
      target: SVGElement | string, // required (SVG element or selector)
      data: Track[],               // required (see types below)
      d3: d3,                      // optional (use global d3 if not provided)
      options?: {
        header?: { title?: string, subtitle?: string, logoHref?: string },
        showToday?: boolean,
        onMilestoneClick?: (milestone, track) => void,
        orientation?: 'auto' | 'horizontal' | 'vertical'
      }
    })
    .render();

  Types:
    Track = { track: string, label?: string, color: string, dates: Milestone[] }
    Milestone = { date: string, name: string, type: 'start'|'end'|'submission'|'notification'|'review'|'abstract'|'invitation'|'cameraReady', url?: string, label?: string }
*/

/* eslint-disable no-undef */

export class TubeTimeline {
  constructor(cfg) {
    const { target, data, d3: d3lib, options = {} } = cfg || {};
    if (!target) throw new Error('TubeTimeline: target is required');
    if (!data) throw new Error('TubeTimeline: data is required');
    this.d3 = d3lib || (typeof d3 !== 'undefined' ? d3 : null);
    if (!this.d3) throw new Error('TubeTimeline: d3 v7 is required (pass via cfg.d3 or include globally)');
    this.root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!(this.root instanceof SVGElement)) throw new Error('TubeTimeline: target must be an <svg> element');
    this.data = JSON.parse(JSON.stringify(data)); // defensive copy
    this.options = {
      header: { title: 'Timeline', subtitle: '', logoHref: null, ...(options.header || {}) },
      showToday: options.showToday !== false,
      onMilestoneClick: options.onMilestoneClick || ((m) => m.url && window.open(m.url, '_blank')),
      onMilestoneDrag: options.onMilestoneDrag || null,
      orientation: options.orientation || 'auto'
    };
    this.boundResize = () => this.render();
    this.activeTrack = null;
    this.xScale = null;
    this.yScale = null;
    this.isHorizontal = null;
  }

  parseDate(str) {
    if (!str && str !== 0) return null;
    if (str instanceof Date) return str;
    // DD/MM/YYYY
    const fullMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(str).trim());
    if (fullMatch) return new Date(+fullMatch[3], +fullMatch[2] - 1, +fullMatch[1]);
    // MM/YYYY
    const monthYearMatch = /^(\d{2})\/(\d{4})$/.exec(String(str).trim());
    if (monthYearMatch) return new Date(+monthYearMatch[2], +monthYearMatch[1] - 1, 1);
    // ISO YYYY-MM-DD
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
    if (isoMatch) return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    // Fallback: try Date.parse for other formats
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) return new Date(parsed);
    return null;
  }

  preprocess() {
    this.data.forEach(track => track.dates.forEach(d => (d.parsed = this.parseDate(d.date))));
    this.data.sort((a, b) => {
      const aStart = a.dates.find(d => d.type === 'start' && d.parsed)?.parsed || a.dates.find(d => d.parsed)?.parsed;
      const bStart = b.dates.find(d => d.type === 'start' && d.parsed)?.parsed || b.dates.find(d => d.parsed)?.parsed;
      return (aStart || new Date(9999, 0, 1)) - (bStart || new Date(9999, 0, 1));
    });
    this.allDates = [...new Set(this.data.flatMap(t => t.dates.map(d => d.parsed).filter(Boolean)))].sort((a, b) => a - b);
    this.trackNames = this.data.map(d => d.track);
    this.svg = this.d3.select(this.root);
  }

  renderHeader(isHorizontal, scale) {
    const { header } = this.options;
    this.svg.select('.header-group').remove();
    const headerGroup = this.svg.append('g').attr('class', 'header-group');

    const minHeight = this.root.clientHeight;
    const logoHeight = Math.max(24, Math.min(40, minHeight * 0.08));
    const titleFontSize = Math.max(14, Math.min(20, minHeight * 0.035));
    const subtitleFontSize = Math.max(10, Math.min(13, minHeight * 0.022));

    if (header.logoHref) {
      headerGroup.append('image')
        .attr('x', 6).attr('y', 4).attr('height', logoHeight)
        .attr('href', header.logoHref).attr('preserveAspectRatio', 'xMidYMid meet');
    }
    headerGroup.append('text')
      .attr('x', (header.logoHref ? logoHeight : 0) + 12).attr('y', logoHeight * 0.6)
      .attr('text-anchor', 'start')
      .attr('font-size', titleFontSize).attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif').attr('fill', '#222')
      .text(header.title || 'Timeline');
    if (header.subtitle) {
      headerGroup.append('text')
        .attr('x', (header.logoHref ? logoHeight : 0) + 12).attr('y', logoHeight * 0.95)
        .attr('text-anchor', 'start')
        .attr('font-size', subtitleFontSize).attr('font-family', 'sans-serif')
        .attr('fill', '#666').text(header.subtitle);
    }

    // Legend
    const isHeightConstrained = this.root.clientHeight < 500;
    const legendSpacing = isHeightConstrained ? 14 : 18;
    const legendCols = 2;
    const legendRows = Math.ceil(this.data.length / legendCols);
    let maxTextWidths = [0, 0];
    this.data.forEach((track, i) => {
      const col = i % legendCols;
      const tempText = headerGroup.append('text')
        .attr('x', 0).attr('y', -100).attr('font-size', isHeightConstrained ? 10 : 13)
        .attr('font-family', 'sans-serif').text(track.track);
      const textWidth = tempText.node().getBBox().width;
      if (textWidth > maxTextWidths[col]) maxTextWidths[col] = textWidth;
      tempText.remove();
    });
    const isVertical = this.root.clientWidth < this.root.clientHeight;
    const colWidth = Math.max(...maxTextWidths) + (isVertical ? 2 : 8);
    const legendRectWidth = legendCols * colWidth + (isVertical ? 4 : 8);
    const legendHeight = legendRows * (isVertical ? 12 : 18);
    const legendPadding = 5;
    const legendX = this.root.clientWidth - legendRectWidth - legendPadding;
    const legendY = 6;
    const legendGroup = headerGroup.append('g')
      .attr('class', 'subway-legend')
      .attr('transform', `translate(${legendX},${legendY + 2})`);
    legendGroup.append('rect')
      .attr('x', -legendPadding).attr('y', -legendPadding)
      .attr('width', legendRectWidth).attr('height', legendHeight)
      .attr('rx', 6).attr('fill', '#fff').attr('stroke', '#000')
      .attr('stroke-width', 2).attr('opacity', 1);
    this.data.forEach((track, i) => {
      const col = i % legendCols, row = Math.floor(i / legendCols);
      const xBase = col * colWidth, yBase = row * (isVertical ? 10 : legendSpacing) + (isVertical ? 2 : 4);

      const isActive = this.activeTrack === track.track;
      const isDimmed = this.activeTrack && !isActive;

      const itemGroup = legendGroup.append('g')
        .attr('cursor', 'pointer')
        .attr('opacity', isDimmed ? 0.4 : 1)
        .on('click', () => {
          this.activeTrack = isActive ? null : track.track;
          this.render();
        });

      itemGroup.append('line')
        .attr('x1', xBase).attr('y1', yBase)
        .attr('x2', xBase + (isHeightConstrained ? 8 : 12)).attr('y2', yBase)
        .attr('stroke', track.color).attr('stroke-width', isHeightConstrained ? 4 : 6)
        .attr('stroke-linecap', 'round');

      itemGroup.append('text')
        .attr('x', xBase + (isHeightConstrained ? 12 : 17)).attr('y', yBase + (isHeightConstrained ? 3 : 4))
        .attr('font-size', isHeightConstrained ? 9 : 11)
        .attr('fill', '#222')
        .attr('font-weight', isActive ? 'bold' : 'normal')
        .attr('font-family', 'sans-serif').text(track.track);
    });
  }

  showSvgTooltip(g, x, y, html, isHorizontal, isLabel = false) {
    this.removeSvgTooltip(g);
    const text = html.replace(/<br>/g, ' ').replace(/<[^>]+>/g, '');
    const fontSize = 13, padding = 10, lineHeight = 18;
    const lines = html.split('<br>');
    const width = Math.max(80, text.length * fontSize * 0.5);
    const height = lines.length * lineHeight + padding * 2;
    let tooltipX = x, tooltipY = y;
    if (isHorizontal) {
      tooltipY -= height + 18;
      if (tooltipY < 0) tooltipY = y + 24;
    } else {
      tooltipX += 24; tooltipY -= height / 2;
      if (tooltipX + width > g.node().ownerSVGElement.clientWidth) tooltipX = x - width - 24;
      if (isLabel) tooltipY += 20;
    }
    const tooltipGroup = g.append('g').attr('class', 'svg-tooltip').attr('pointer-events', 'none');
    tooltipGroup.append('rect')
      .attr('x', tooltipX - width / 2).attr('y', tooltipY)
      .attr('width', width).attr('height', height)
      .attr('rx', 8).attr('fill', '#333').attr('stroke', '#222').attr('opacity', 0.95);
    lines.forEach((line, i) => {
      tooltipGroup.append('text')
        .attr('x', tooltipX)
        .attr('y', tooltipY + padding + (i + 1) * lineHeight - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', fontSize)
        .attr('fill', '#fff')
        .attr('font-family', 'sans-serif')
        .html(line.replace(/<[^>]+>/g, ''));
    });
  }
  removeSvgTooltip(g) { g.selectAll('.svg-tooltip').remove(); }

  render() {
    this.preprocess();
    const d3 = this.d3;
    this.svg.selectAll('*').remove();

    const viewportHeight = this.root.clientHeight;
    const viewportWidth = this.root.clientWidth;
    const forced = this.options.orientation;
    const isHorizontal = forced === 'auto' ? viewportWidth >= viewportHeight : forced === 'horizontal';
    const isHeightConstrained = viewportHeight < 500;
    const scale = isHeightConstrained ? Math.max(0.6, viewportHeight / 500) : 1;
    const baseHeaderHeight = isHorizontal ? 50 : 40;
    const headerHeight = Math.min(baseHeaderHeight * scale, viewportHeight * 0.12);
    
    // Calculate maximum label extent to account for rotated labels in both orientations
    // Use a reliable estimation method that works in all contexts
    let maxLabelExtentRight = 0; // Extent to the right (for horizontal and vertical)
    let maxLabelExtentBottom = 0; // Extent downward (for vertical mode labels)
    
    const labelFontSize = isHeightConstrained ? 11 : 15;
    // Estimate character width (approximate for bold text)
    const charWidth = labelFontSize * 0.65;
    const textHeight = labelFontSize * 1.2;
    const rotationRad = 30 * Math.PI / 180;
    
    // Find the longest label line across all milestones
    this.data.forEach(track => {
      track.dates.forEach(d => {
        if (d.label) {
          const labelLines = d.label.split(' ');
          labelLines.forEach(line => {
            if (line.trim()) {
              const textWidth = line.length * charWidth;
              // For -30° rotation, calculate extents
              // Horizontal component (to the right) = width * cos(30°) + height * sin(30°)
              // Vertical component (downward) = width * sin(30°) + height * cos(30°)
              const rotatedExtentRight = textWidth * Math.cos(rotationRad) + textHeight * Math.sin(rotationRad);
              const rotatedExtentBottom = textWidth * Math.sin(rotationRad) + textHeight * Math.cos(rotationRad);
              maxLabelExtentRight = Math.max(maxLabelExtentRight, rotatedExtentRight);
              maxLabelExtentBottom = Math.max(maxLabelExtentBottom, rotatedExtentBottom);
            }
          });
        }
      });
    });
    
    // Calculate base margins first
    const baseLeftMargin = 35 * scale;
    const baseRightMargin = 60 * scale;
    const baseTopMargin = Math.min(16 * scale, viewportHeight * 0.03);
    const baseBottomMargin = Math.min(30 * scale, viewportHeight * 0.06);
    
    const safetyPadding = 20 * scale;
    
    // For horizontal timelines: labels extend to the right from milestone positions
    // The group is offset by margin.left/2, and labels extend maxLabelExtentRight to the right
    // from milestone positions. The rightmost milestone is at position 'width' in group coords,
    // which is at margin.left/2 + width = margin.left/2 + (clientWidth - margin.right) in SVG coords.
    // To prevent clipping: margin.left/2 + (clientWidth - margin.right) + maxLabelExtentRight <= clientWidth
    // This simplifies to: margin.right >= margin.left/2 + maxLabelExtentRight
    const requiredRightMargin = isHorizontal 
      ? Math.max(baseRightMargin, baseLeftMargin / 2 + maxLabelExtentRight + safetyPadding)
      : baseRightMargin;
    
    // For vertical timelines: labels extend to the right from milestone positions
    // Milestones are positioned along tracks (xScale), which ranges from [16, width - 16]
    // Labels are offset by laneHeight * 2.2 to the right from milestone positions
    // The rightmost track is at position 'width - 16' in group coords
    // Labels extend maxLabelExtentRight further to the right
    // Total rightward extent from rightmost track: (width - 16) + laneHeight * 2.2 + maxLabelExtentRight
    // In SVG coords (group offset by margin.left): margin.left + (width - 16) + laneHeight * 2.2 + maxLabelExtentRight
    // We need: margin.left + (width - 16) + laneHeight * 2.2 + maxLabelExtentRight <= clientWidth
    // Since width = clientWidth - margin.left - 1.5 * margin.right (for vertical):
    // margin.left + (clientWidth - margin.left - 1.5 * margin.right - 16) + laneHeight * 2.2 + maxLabelExtentRight <= clientWidth
    // Simplifies to: -1.5 * margin.right + laneHeight * 2.2 + maxLabelExtentRight - 16 <= 0
    // So: margin.right >= (laneHeight * 2.2 + maxLabelExtentRight - 16 + safetyPadding) / 1.5
    const laneHeight = 15 * scale;
    const labelXOffset = laneHeight * 2.2;
    const verticalLabelExtent = labelXOffset + maxLabelExtentRight + safetyPadding;
    const requiredRightMarginVertical = !isHorizontal
      ? Math.max(baseRightMargin, (verticalLabelExtent - 16) / 1.5)
      : 0;
    
    // For vertical mode, also check if labels extend beyond bottom
    // The bottommost milestone is at position height * 0.95 in group coords
    // Labels are offset downward (labelYOffset = 5 + i * labelSpacing) and rotated
    // The maximum downward extent is maxLabelExtentBottom
    // In SVG coords: margin.top + headerHeight + (height * 0.95) + maxLabelExtentBottom
    // We need this to be <= clientHeight, but since height already accounts for margins,
    // we just need to ensure bottom margin accounts for label extent
    const requiredBottomMarginVertical = !isHorizontal
      ? Math.max(baseBottomMargin, maxLabelExtentBottom + safetyPadding)
      : 0;
    
    // For vertical mode, check if the "Today" flag extends beyond left boundary
    // The flag is positioned at fx = -baseFlagWidth - 6 in group coords
    // In SVG coords (group offset by margin.left): margin.left - baseFlagWidth - 6
    // We need: margin.left - baseFlagWidth - 6 >= 0, so margin.left >= baseFlagWidth + 6
    // Calculate flag dimensions (same as in render code)
    const baseFlagWidth = !isHorizontal 
      ? Math.max(48, Math.min(80, viewportWidth * 0.045))
      : 0;
    const requiredLeftMarginVertical = !isHorizontal
      ? Math.max(baseLeftMargin, baseFlagWidth + 6 + safetyPadding)
      : 0;
    
    const margin = {
      top: baseTopMargin,
      right: isHorizontal ? requiredRightMargin : Math.max(baseRightMargin, requiredRightMarginVertical),
      bottom: isHorizontal ? baseBottomMargin : Math.max(baseBottomMargin, requiredBottomMarginVertical),
      left: isHorizontal ? baseLeftMargin : Math.max(baseLeftMargin, requiredLeftMarginVertical)
    };

    this.renderHeader(isHorizontal, scale);
    const height = this.root.clientHeight - margin.top - margin.bottom - headerHeight;
    const g = this.svg.append('g').attr('transform', `translate(${isHorizontal ? margin.left / 2 : margin.left},${margin.top + headerHeight})`);
    const width = this.root.clientWidth - (isHorizontal ? margin.right : margin.left + 1.5 * margin.right);

    let xScale, yScale;
    // Store scales and orientation for drag handlers
    this.xScale = null;
    this.yScale = null;
    this.isHorizontal = isHorizontal;
    const trackLinesGroup = g.append('g')
      .attr('class', 'track-lines-group')
      .attr('transform', isHorizontal ? 'translate(0, 60)' : 'translate(0, 0)');

    if (isHorizontal) {
      xScale = d3.scaleTime().domain(d3.extent(this.allDates)).range([margin.left, width]);
      yScale = d3.scalePoint().domain(this.trackNames).range([20, height - height * 0.15]).padding(0.1);
      this.xScale = xScale;
      this.yScale = yScale;
      trackLinesGroup.selectAll('.track-line')
        .data(this.data).enter().append('line')
        .attr('class', 'track-line')
        .attr('x1', d => {
          const start = (d.dates.find(date => date.type === 'start' && date.parsed)?.parsed) || (d.dates.find(date => date.parsed)?.parsed) || this.allDates[0];
          return xScale(start);
        })
        .attr('x2', d => {
          const end = (d.dates.find(date => date.type === 'end' && date.parsed)?.parsed) || (d.dates.slice().reverse().find(date => date.parsed)?.parsed) || this.allDates[this.allDates.length - 1];
          return xScale(end);
        })
        .attr('y1', d => yScale(d.track)).attr('y2', d => yScale(d.track))
        .attr('stroke', d => d.color).attr('stroke-width', laneHeight).attr('stroke-linecap', 'round');
    } else {
      xScale = d3.scalePoint().domain(this.trackNames).range([16, width - 16]).padding(0);
      yScale = d3.scaleTime().domain(d3.extent(this.allDates)).range([height * 0.05, height * 0.95]);
      this.xScale = xScale;
      this.yScale = yScale;
      trackLinesGroup.selectAll('.track-line')
        .data(this.data).enter().append('line')
        .attr('class', 'track-line')
        .attr('y1', d => {
          const start = (d.dates.find(date => date.type === 'start' && date.parsed)?.parsed) || (d.dates.find(date => date.parsed)?.parsed) || this.allDates[0];
          return yScale(start);
        })
        .attr('y2', d => {
          const end = (d.dates.find(date => date.type === 'end' && date.parsed)?.parsed) || (d.dates.slice().reverse().find(date => date.parsed)?.parsed) || this.allDates[this.allDates.length - 1];
          return yScale(end);
        })
        .attr('x1', d => xScale(d.track)).attr('x2', d => xScale(d.track))
        .attr('stroke', d => d.color).attr('stroke-width', laneHeight).attr('stroke-linecap', 'round');
    }

    // Milestones
    const timelineInstance = this; // Capture instance for use in callbacks
    this.data.forEach(track => {
      const pos = isHorizontal
        ? { fixed: yScale(track.track), axis: d => xScale(d.parsed) }
        : { fixed: xScale(track.track), axis: d => yScale(d.parsed) };

      const isDimmed = this.activeTrack && this.activeTrack !== track.track;
      const opacity = isDimmed ? 0.2 : 1; // dimmed tracks show at 20% opacity

      trackLinesGroup.selectAll()
        .data(track.dates.filter(d => d.parsed)).enter().append('g')
        .attr('class', 'milestone-group')
        .attr('transform', d => {
          const x = isHorizontal ? pos.axis(d) : pos.fixed;
          const y = isHorizontal ? pos.fixed : pos.axis(d);
          return `translate(${x},${y})`;
        })
        .attr('opacity', opacity)
        .each(function (d) {
          const milestoneGroup = d3.select(this);
          if (d.type === 'start' || d.type === 'end') {
            const handleRect = milestoneGroup.append('rect')
              .attr('x', isHorizontal ? -laneHeight : -laneHeight)
              .attr('y', isHorizontal ? -laneHeight * 1.5 : -laneHeight * 0.625)
              .attr('width', isHorizontal ? laneHeight * 1.5 : laneHeight * 2)
              .attr('height', isHorizontal ? laneHeight * 3 : laneHeight * 1.25)
              .attr('fill', '#fff').attr('stroke', '#000').attr('stroke-width', 5)
              .attr('rx', 8).attr('ry', 8);
            
            // Add drag functionality if callback is provided
            if (timelineInstance.options?.onMilestoneDrag) {
              handleRect
                .attr('cursor', 'grab')
                .style('cursor', 'grab');
              
              let draggedDate = null; // Store the final date
              const drag = d3.drag()
                .on('start', function(event) {
                  d3.select(this).style('cursor', 'grabbing');
                  draggedDate = null;
                })
                .on('drag', function(event) {
                  // Get pointer coordinates relative to the g element (which contains the scales)
                  const [pointerX, pointerY] = d3.pointer(event, g.node());
                  
                  let newDate;
                  if (isHorizontal) {
                    // Constrain to horizontal axis (track position)
                    newDate = xScale.invert(pointerX);
                  } else {
                    // Constrain to vertical axis (track position)
                    newDate = yScale.invert(pointerY);
                  }
                  
                  // Clamp to domain
                  const domain = isHorizontal ? xScale.domain() : yScale.domain();
                  if (newDate < domain[0]) newDate = domain[0];
                  if (newDate > domain[1]) newDate = domain[1];
                  
                  // Store the date for the end callback
                  draggedDate = newDate;
                  
                  // Update position visually (no re-render during drag)
                  const newX = isHorizontal ? xScale(newDate) : pos.fixed;
                  const newY = isHorizontal ? pos.fixed : yScale(newDate);
                  milestoneGroup.attr('transform', `translate(${newX},${newY})`);
                })
                .on('end', function(event) {
                  d3.select(this).style('cursor', 'grab');
                  
                  // Call callback only on drag end to update data model
                  if (draggedDate !== null && timelineInstance.options.onMilestoneDrag) {
                    const fmtDate = (date) => {
                      const d = new Date(date);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = d.getFullYear();
                      return `${day}/${month}/${year}`;
                    };
                    timelineInstance.options.onMilestoneDrag(d, track, fmtDate(draggedDate));
                  }
                });
              
              handleRect.call(drag);
            }
          } else {
            d3.select(this).append('rect')
              .attr('x', 0).attr('y', isHorizontal ? -laneHeight * 2 : 0)
              .attr('width', isHorizontal ? laneHeight : laneHeight * 1.5)
              .attr('height', isHorizontal ? laneHeight * 2 : laneHeight)
              .attr('fill', track.color).attr('stroke', 'none')
              .attr('rx', 4).attr('ry', 4);
          }
          const labelLines = (d.label || '').split(' ');
          labelLines.forEach((line, i) => {
            const labelSpacing = isHeightConstrained ? 12 : 16;
            const labelYOffset = isHorizontal ? -laneHeight * 2.75 + i * labelSpacing : 5 + i * labelSpacing;
            const labelXOffset = isHorizontal ? 0 : laneHeight * 2.2;
            d3.select(this).append('text')
              .attr('class', 'milestone-label')
              .attr('text-anchor', 'start')
              .attr('font-size', isHeightConstrained ? 11 : 15).attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif').attr('fill', '#222')
              .attr('x', labelXOffset).attr('y', labelYOffset)
              .attr('transform', `rotate(-30 ${labelXOffset} ${labelYOffset})`)
              .text(line);
          });
        })
        .on('mouseover', (event, d) => {
          const coords = event.currentTarget.getAttribute('transform').match(/translate\(([^,]+),([^)]+)\)/);
          const x = +coords[1], y = +coords[2];
          this.showSvgTooltip(g, x, y, `<strong>${d.name}</strong><br>${d.date}`, isHorizontal);
        })
        .on('mousemove', (event, d) => {
          const coords = event.currentTarget.getAttribute('transform').match(/translate\(([^,]+),([^)]+)\)/);
          const x = +coords[1], y = +coords[2];
          this.showSvgTooltip(g, x, y, `<strong>${d.name}</strong><br>${d.date}`, isHorizontal);
        })
        .on('mouseout', () => this.removeSvgTooltip(g))
        .on('click', (_, d) => this.options.onMilestoneClick(d, track));
    });

    if (this.activeTrack) {
      trackLinesGroup.selectAll('.track-line')
        .attr('opacity', d => d.track === this.activeTrack ? 1 : 0.2);
    }

    // Month ticks/labels
    let months = [];
    if (this.allDates.length) {
      months = this.d3.timeMonths(
        this.d3.timeMonth.ceil(this.allDates[0]),
        this.d3.timeMonth.offset(this.d3.timeMonth.ceil(this.allDates[this.allDates.length - 1]), 1)
      );
    }
    if (isHorizontal) {
      g.selectAll('.month-tick').data(months).enter().append('line')
        .attr('class', 'month-tick')
        .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
        .attr('y1', 45).attr('y2', height)
        .attr('stroke', '#ddd').attr('stroke-width', 1);
      g.selectAll('.month-label').data(months).enter().append('text')
        .attr('class', 'month-label')
        .attr('x', d => xScale(d)).attr('y', 35)
        .attr('text-anchor', 'middle').attr('font-size', 11 * scale)
        .attr('fill', '#bbb').text(d => this.d3.timeFormat('%b')(d));
    } else {
      g.selectAll('.month-tick').data(months).enter().append('line')
        .attr('class', 'month-tick')
        .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
        .attr('x1', 0).attr('x2', width)
        .attr('stroke', '#ddd').attr('stroke-width', 1);
      g.selectAll('.month-label').data(months).enter().append('text')
        .attr('class', 'month-label')
        .attr('x', -10).attr('y', d => yScale(d) + 4)
        .attr('text-anchor', 'end').attr('font-size', 11)
        .attr('fill', '#bbb').text(d => this.d3.timeFormat('%b')(d));
    }

    if (this.options.showToday && this.allDates.length) {
      const today = new Date();
      if (today >= this.allDates[0] && today <= this.allDates[this.allDates.length - 1]) {
        const linePos = isHorizontal ? xScale(today) : yScale(today);
        // compute explicit endpoints
        let x1, x2, y1, y2;
        if (isHorizontal) {
          x1 = linePos; x2 = linePos; y1 = 45; y2 = height;
        } else {
          y1 = linePos; y2 = linePos; x1 = 0; x2 = width;
        }
        g.append('line')
          .attr('class', 'today-line')
          .attr('x1', x1).attr('x2', x2).attr('y1', y1).attr('y2', y2)
          .attr('stroke', '#e74c3c').attr('stroke-width', 2).attr('stroke-dasharray', '4 2');

        const baseFlagWidth = Math.max(48, Math.min(80, this.root.clientWidth * 0.045));
        const baseFlagHeight = Math.max(20, Math.min(32, this.root.clientHeight * 0.025));
        const flagGroup = g.append('g').attr('class', 'today-flag-group');
        const flagX = isHorizontal ? linePos : 0;
        const flagY = isHorizontal ? 45 : linePos;
        if (isHorizontal) {
          flagGroup.append('polygon')
            .attr('points', `${flagX},${flagY} ${flagX + baseFlagWidth},${flagY + baseFlagHeight / 2} ${flagX},${flagY + baseFlagHeight}`)
            .attr('fill', '#e74c3c').attr('stroke', '#b03a2e').attr('stroke-width', 2);
          flagGroup.append('text')
            .attr('x', flagX + baseFlagWidth / 2)
            .attr('y', flagY + baseFlagHeight / 2 + 2)
            .attr('font-size', 13)
            .attr('font-family', 'sans-serif')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .text('Today');
        } else {
          // vertical: draw a left-side flag
          const fx = -baseFlagWidth - 6;
          flagGroup.append('rect')
            .attr('x', fx).attr('y', flagY - baseFlagHeight / 2)
            .attr('width', baseFlagWidth).attr('height', baseFlagHeight)
            .attr('rx', 4).attr('fill', '#e74c3c').attr('stroke', '#b03a2e').attr('stroke-width', 2);
          flagGroup.append('text')
            .attr('x', fx + baseFlagWidth / 2)
            .attr('y', flagY + 2)
            .attr('font-size', 12)
            .attr('font-family', 'sans-serif')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .text('Today');
        }
      }
      g.selectAll('.today-line').raise();
    }
    g.selectAll('.track-line').raise();
    g.selectAll('g').raise();

    // Listen for resize for responsive redraw
    window.removeEventListener('resize', this.boundResize);
    window.addEventListener('resize', this.boundResize);
    return this;
  }

  destroy() {
    if (this.svg) this.svg.selectAll('*').remove();
    window.removeEventListener('resize', this.boundResize);
  }
}

export default TubeTimeline;


