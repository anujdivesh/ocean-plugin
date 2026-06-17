import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import { 
  formatDateToISOWithoutMilliseconds, 
  formatDateToISOWithoutMilliseconds3Monthly, 
  getDateFromArray
} from './helper';

function DateSelector({ item, period, startDateStr, endDateStr, onDateChange }) {
  const _isMounted = useRef(true);
  const [startDateOrig] = useState(new Date());
  const [endDateOrig] = useState(new Date());

  const [startDate, setStartDate] = useState(startDateStr);
  const [endDate, setEndDate] = useState(endDateStr);
  const dateArray = useRef([]);
  const [currentDate, setCurrentDate] = useState();

  const today = new Date();
  const sevenDaysLater = new Date(today); // Copy the current date
  sevenDaysLater.setDate(today.getDate() + 7);

  const [starttoday, setstarttoday] = useState(today);
  const [end7day, setend7day] = useState(sevenDaysLater);

  const PortalDatePicker = ({ children }) => {
    return createPortal(children, document.body);
  };

  // Initialize variables safely
  const spec = item?.layer_information?.specific_timestemps || null;
  const specifc_stemps = item?.layer_information?.specific_timestemps && item.layer_information.specific_timestemps !== null
    ? item.layer_information.specific_timestemps.split(',').map((s) => s.trim())
    : null;
  const weekRange = item?.layer_information?.interval_step && item.layer_information.interval_step !== null
    ? item.layer_information.interval_step.split(',').map((s) => s.trim())
    : null;

  // Function to handle date changes
  const handleChange = (selectedDate, item) => {
    if (item.layer_information.datetime_format === 'MONTHLY') {
      // console.log('MONTHLY2');
      if (spec !== "") {
        var exactDate = getDateFromArray(dateArray.current, selectedDate.getFullYear(), selectedDate.getMonth() + 1);
        const dateString = `${exactDate.getFullYear()}-${String(exactDate.getMonth() + 1).padStart(2, '0')}-${String(exactDate.getDate()).padStart(2, '0')}T${String(exactDate.getHours()).padStart(2, '0')}:${String(exactDate.getUTCMinutes()).padStart(2, '0')}:${String(exactDate.getUTCSeconds()).padStart(2, '0')}.000Z`;
        setCurrentDate(exactDate);
        
        if (onDateChange) {
          onDateChange({
            currentDate: dateString,
            timeIntervalStart: startDateOrig.toISOString(),
            timeIntervalEnd: dateString
          });
        }
      } else {
        setCurrentDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
        if (onDateChange) {
          onDateChange({
            currentDate: formatDateToISOWithoutMilliseconds(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
            timeIntervalStart: formatDateToISOWithoutMilliseconds(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
            timeIntervalEnd: endDateOrig.toISOString()
          });
        }
      }
    } else if (item.layer_information.datetime_format === 'WEEKLY') {
      // console.log('WEEKLY2');
      // Accept either index (number/string) or raw date string from specific_timestemps
      let indexCandidate = null;
      let raw = null;

      if (typeof selectedDate === 'object' && selectedDate !== null && 'index' in selectedDate) {
        indexCandidate = parseInt(selectedDate.index, 10);
      } else if (/^\d+$/.test(String(selectedDate).trim())) {
        indexCandidate = parseInt(String(selectedDate).trim(), 10);
      } else {
        raw = String(selectedDate || '').trim();
      }

      if (raw == null) {
        if (Number.isNaN(indexCandidate) || !specifc_stemps || !specifc_stemps[indexCandidate]) {
          console.warn('WEEKLY: invalid index or specific timestamps missing', { selectedDate, indexCandidate, specifc_stemps });
          return;
        }
        raw = (specifc_stemps[indexCandidate] || '').trim();
        setCurrentDate(indexCandidate);
      } else {
        // Try to sync currentDate to the matching index if present
        const foundIdx = Array.isArray(specifc_stemps) ? specifc_stemps.findIndex((d) => String(d).trim() === raw) : -1;
        if (foundIdx >= 0) setCurrentDate(foundIdx); else setCurrentDate(0);
      }

      const dateWithZ = raw.endsWith('Z') ? raw : `${raw}Z`;
      const formattedDate = new Date(dateWithZ).toISOString().split('T')[0] + 'T00:00:00Z';
      // console.log(formattedDate)
      if (onDateChange) {
        onDateChange({
          currentDate: formattedDate,
          timeIntervalStart: formattedDate,
          timeIntervalEnd: formattedDate
        });
      }
    } else {
      setCurrentDate(selectedDate);
      
      if (onDateChange) {
        onDateChange({
          currentDate: formatDateToISOWithoutMilliseconds(selectedDate),
          timeIntervalStart: startDateOrig.toISOString(),
          timeIntervalEnd: formatDateToISOWithoutMilliseconds(selectedDate)
        });
      }
    }
  };

  const handleonchange3month = (date, item) => {
    if (onDateChange) {
      onDateChange({
        currentDate: formatDateToISOWithoutMilliseconds3Monthly(date),
        timeIntervalStart: startDateOrig.toISOString(),
        timeIntervalEnd: formatDateToISOWithoutMilliseconds3Monthly(date)
      });
    }
  };


  const handleonchange3monthSeasonal = (date, item) => {
    const d = new Date(date);
    // Force midnight (00:00:00) in UTC
    // console.log(d);
    // console.log(formatDateToISOWithoutMilliseconds3Monthly(d));

    if (onDateChange) {
      onDateChange({
        currentDate: formatDateToISOWithoutMilliseconds3Monthly(d),
        timeIntervalStart: formatDateToISOWithoutMilliseconds3Monthly(d),
        timeIntervalEnd: endDateOrig.toISOString()
      });
    }
  };

  useEffect(() => {
    if (_isMounted.current) {
      if (item.layer_information.datetime_format === 'DAILY') {
        // console.log('DAILY2');
        setStartDate(startDateStr);
        setEndDate(endDateStr);
        
        if (item.layer_information.layer_type === "WMS_FORECAST") {
          // console.log('DAILY2 WMS_FORECAST');
          setCurrentDate(startDateStr);
        } else {
          setCurrentDate(endDateStr);
        }
      } else if (item.layer_information.datetime_format === 'MONTHLY' || item.layer_information.datetime_format === '3MONTHLY') {
        // console.log('MONTHLY2');
        var dateTimeArray;
        if (spec !== "") {
          dateTimeArray = spec.split(',').map(timestamp => new Date(timestamp.trim()));
        }
        dateArray.current = dateTimeArray;
        setStartDate(dateTimeArray[0]);
        setEndDate(dateTimeArray[dateTimeArray.length - 1]);
        
        // console.log('DateSelector MONTHLY/3MONTHLY - Props:', {
        //   startDateStr,
        //   endDateStr,
        //   dateTimeArrayLength: dateTimeArray.length,
        //   firstDate: dateTimeArray[0],
        //   lastDate: dateTimeArray[dateTimeArray.length - 1]
        // });
        
        // For MONTHLY and 3MONTHLY, use endDateStr if available (from layerSettingCard initialization)
        // Otherwise fall back to last date in array
        let initialDate;
        if (item.layer_information.layer_type === "WMS_FORECAST") {
          // console.log('MONTHLY2 WMS_FORECAST');
          initialDate = dateTimeArray[0];
        } else {
          if (endDateStr && endDateStr !== '') {
            initialDate = new Date(endDateStr);
            // console.log('DateSelector MONTHLY/3MONTHLY - Using endDateStr:', endDateStr, '-> initialDate:', initialDate);
          } else {
            initialDate = dateTimeArray[dateTimeArray.length - 1];
            // console.log('DateSelector MONTHLY/3MONTHLY - Using fallback date:', initialDate);
          }
        }
        setCurrentDate(initialDate);
      } else if (item.layer_information.datetime_format === 'WEEKLY_NRT') {
        // console.log('WEEKLY_NRT2');
        var weeklyNrtArray;
        if (spec !== "") {
          weeklyNrtArray = spec.split(',').map(timestamp => new Date(timestamp.trim()));
        }
        dateArray.current = weeklyNrtArray;
        setStartDate(weeklyNrtArray[0]);
        setEndDate(weeklyNrtArray[weeklyNrtArray.length - 1]);
        
        if (item.layer_information.layer_type === "WMS_FORECAST") {
          // console.log('WEEKLY_NRT2 WMS_FORECAST');
          setCurrentDate(weeklyNrtArray[0]);
        } else {
          setCurrentDate(weeklyNrtArray[weeklyNrtArray.length - 1]);
        }
      } else if (item.layer_information.datetime_format === 'HOURLY') {
        // console.log('HOURLY2');
        // console.log(endDateStr);
        setCurrentDate(new Date(endDateStr));
      } else if (item.layer_information.datetime_format === '3MONTHLY_SEASONAL') {
        // console.log('3MONTHLY_SEASONAL2');
        let dateTimeArray = [];
        const hasSpec = typeof spec === 'string' && spec.trim() !== '';

        if (hasSpec) {
          dateTimeArray = spec
            .split(',')
            .map(t => new Date(t.trim()))
            .filter(d => !isNaN(d));
        } else {
          const sSrc = item.layer_information?.timeIntervalStartOriginal || startDateStr;
          const eSrc = item.layer_information?.timeIntervalEndOriginal || endDateStr;
          const s = sSrc ? new Date(sSrc) : null;
          const e = eSrc ? new Date(eSrc) : null;

          if (s && e && !isNaN(s) && !isNaN(e)) {
            const d = new Date(s.getFullYear(), s.getMonth(), 1);
            while (d <= e) {
              dateTimeArray.push(new Date(d));
              d.setMonth(d.getMonth() + 3);
            }
          }
        }

        dateArray.current = dateTimeArray;

        if (dateTimeArray.length) {
          setStartDate(dateTimeArray[0]);
          setEndDate(dateTimeArray[dateTimeArray.length - 1]);
          
          // console.log('DateSelector 3MONTHLY_SEASONAL - Props:', {
          //   startDateStr,
          //   endDateStr,
          //   dateTimeArrayLength: dateTimeArray.length,
          //   firstDate: dateTimeArray[0],
          //   lastDate: dateTimeArray[dateTimeArray.length - 1]
          // });
          
          // For 3MONTHLY_SEASONAL, default to the first item in the dropdown list
          setCurrentDate(dateTimeArray[0]);
          // Propagate the default first date to the parent so Generate Plot uses it
          handleonchange3monthSeasonal(dateTimeArray[0], item);
        }
      } else if (item.layer_information.datetime_format === 'WEEKLY') {
        // console.log('WEEKLY');
        // For WEEKLY format, initialize to the first item (index 0)
        if (specifc_stemps && specifc_stemps.length > 0) {
          setCurrentDate(0);
        }
      }
    }
    return () => { _isMounted.current = false };
  }, [endDateStr, item.layer_information.datetime_format, item.layer_information.layer_type, item.layer_information?.timeIntervalEndOriginal, item.layer_information?.timeIntervalStartOriginal, spec, specifc_stemps, startDateStr]);

  const onChange = (dates, item) => {
    const [start, end] = dates;
    setstarttoday(start);
    setend7day(end);
    if (start !== null && end !== null) {
      if (onDateChange) {
        onDateChange({
          currentDate: formatDateToISOWithoutMilliseconds(end),
          timeIntervalStart: formatDateToISOWithoutMilliseconds(start),
          timeIntervalEnd: formatDateToISOWithoutMilliseconds(end)
        });
      }
    }
  };

  // Safety check to ensure item and layer_information exist
  if (!item || !item.layer_information) {
    console.warn('DateSelector: item or layer_information is undefined', item);
    return <div>Loading...</div>;
  }

  // Content rendering based on datetime format
  let content;
  if (item.layer_information.datetime_format === 'DAILY') {
    // console.log('DAILY1');
    content = (
      <div style={{ width: '90%' }}>
        <DatePicker
          id="datepicker"
          selected={currentDate}
          showIcon
          onChange={(date) => handleChange(date, item)}
          minDate={startDate}
          maxDate={endDate}
          className="form-control"
          placeholderText="MM/DD/YYYY"
          popperContainer={PortalDatePicker}
          onClick={(e) => e.currentTarget.blur()}
        />
      </div>
    );
  } else if (item.layer_information.datetime_format === 'SPECIFIC') {
    console.log('SPECIFIC1');
    content = (
      <DatePicker
        showIcon
        selected={dateArray.current[0]}
        onChange={(date) => handleChange(date, item)}
        includeDates={dateArray.current}
        className="form-control form-control-sm"
        wrapperClassName="w-100"
        popperPlacement="bottom-start"
        popperContainer={PortalDatePicker}
      />
    );
  } else if (item.layer_information.datetime_format === 'MONTHLY') {
    console.log('MONTHLY1');
    content = (
      <DatePicker
        showIcon
        selected={currentDate}
        onChange={(date) => handleChange(date, item)}
        onClick={(e) => e.currentTarget.blur()}
        dateFormat="yyyy/MM" // Display only month and year
        showMonthYearPicker // Show month and year picker
        showYearDropdown // Show year dropdown
        scrollableYearDropdown // Make the year dropdown scrollable
        yearDropdownItemNumber={15} // Number of years to display in dropdown
        minDate={startDate} // Set minimum date
        maxDate={endDate} // Set maximum date
        className="form-control form-control-sm"
        wrapperClassName="w-100"
        popperPlacement="bottom-start"
        popperContainer={PortalDatePicker}
      />
    );
  } else if (item.layer_information.datetime_format === '3MONTHLY') {
    console.log('3MONTHLY1');
    if (!dateArray.current || dateArray.current.length === 0 || !currentDate) {
      content = <div>Loading dates...</div>;
    } else {
      // Collect unique years and months-by-year (no duplicates)
      const years = [
        ...new Set(dateArray.current.map(d => new Date(d).getFullYear()))
      ].sort((a, b) => a - b);

      const monthsByYear = new Map(); // year -> sorted array of unique month numbers
      dateArray.current.forEach(date => {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = d.getMonth();
        if (!monthsByYear.has(y)) monthsByYear.set(y, new Set());
        monthsByYear.get(y).add(m);
      });
      // Convert month sets to sorted arrays
      for (const [y, mset] of monthsByYear.entries()) {
        monthsByYear.set(y, Array.from(mset).sort((a, b) => a - b));
      }

      // Resolve current selections safely
      const curr = currentDate instanceof Date ? currentDate : new Date(currentDate);
      const currentYear = years.includes(curr.getFullYear()) ? curr.getFullYear() : years[0];
      const monthsForYear = monthsByYear.get(currentYear) || [];
      const currentMonth = monthsForYear.includes(curr.getMonth())
        ? curr.getMonth()
        : (monthsForYear[0] ?? 0);

      content = (
        <div style={{ width: '80%', display: 'flex', gap: '5px', marginLeft: -20 }}>
          {/* Year Select */}
          <select
            className="form-select form-select-sm rounded-pill"
            value={currentYear}
            style={{ minWidth: '80px' }}
            onChange={(e) => {
              const selectedYear = parseInt(e.target.value, 10);
              const monthsForSelectedYear = monthsByYear.get(selectedYear) || [0];

              // Keep current month if available for the new year; otherwise use the first available month
              const monthToUse = monthsForSelectedYear.includes(currentMonth)
                ? currentMonth
                : (monthsForSelectedYear[0] ?? 0);

              const newDate = new Date(currentDate);
              newDate.setFullYear(selectedYear);
              newDate.setMonth(monthToUse);

              setCurrentDate(newDate);
              handleonchange3month(newDate, item);
            }}
          >
            {years.map((year) => (
              <option key={`year-${year}`} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Month Range Select (no duplicates; scoped to selected year) */}
          <select
            className="form-select form-select-sm rounded-pill"
            value={currentMonth}
            style={{ minWidth: '120px' }}
            onChange={(e) => {
              const selectedMonth = parseInt(e.target.value, 10);
              const newDate = new Date(currentDate);
              newDate.setFullYear(currentYear);
              newDate.setMonth(selectedMonth);
              setCurrentDate(newDate);
              handleonchange3month(newDate, item);
            }}
          >
            {monthsForYear.map((m) => {
              const startMonth = new Date(currentYear, m, 1).toLocaleString('default', { month: 'short' });
              const endMonth = new Date(currentYear, m + 2, 1).toLocaleString('default', { month: 'short' });
              return (
                <option key={`month-${currentYear}-${m}`} value={m}>
                  {startMonth} - {endMonth}
                </option>
              );
            })}
          </select>
        </div>
      );
    }
  } else if (item.layer_information.datetime_format === 'WEEKLY_NRT') {
    console.log('WEEKLY_NRT1');
    if (!dateArray.current || dateArray.current.length === 0) {
      content = <div>Loading dates...</div>;
    } else {
      // Extract unique years
      const years = [...new Set(dateArray.current.map(date => new Date(date).getFullYear()))];
      const currentYear = currentDate.getFullYear();

      // Filter dates for current year and sort them
      const datesInYear = dateArray.current
        .map(dateStr => new Date(dateStr))
        .filter(d => d.getFullYear() === currentYear)
        .sort((a, b) => a - b);

      // ISO week number function
      const getISOWeek = (date) => {
        const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
      };

      // Format MM/DD
      const formatDate = (date) => {
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return `${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`;
      };

      // Build unique week numbers and corresponding start dates
      const weekMap = new Map();
      datesInYear.forEach(date => {
        const week = getISOWeek(date);
        if (!weekMap.has(week)) {
          weekMap.set(week, date);
        }
      });

      const weekOptions = Array.from(weekMap.entries()).map(([week, date]) => {
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        return {
          week,
          value: startDate.toISOString(),
          label: `${formatDate(startDate)}-${formatDate(endDate)}`
        };
      });

      // Find the week option matching currentDate
      const currentWeek = getISOWeek(currentDate);
      const currentWeekOption = weekOptions.find(opt => getISOWeek(new Date(opt.value)) === currentWeek);

      content = (
        <div style={{ width: '80%', display: 'flex', gap: '5px', marginLeft: -20 }}>
          {/* Year Select */}
          <select
            className="form-select form-select-sm rounded-pill"
            value={currentYear}
            style={{ minWidth: '80px' }}
            onChange={(e) => {
              const selectedYear = parseInt(e.target.value, 10);
              // Pick the first week date in the new year as default
              const availableDate = dateArray.current
                .map(dateStr => new Date(dateStr))
                .find(d => d.getFullYear() === selectedYear);
              if (availableDate) {
                setCurrentDate(availableDate);
                handleonchange3month(availableDate, item);
              }
            }}
          >
            {years.map((year, index) => (
              <option key={`year-${index}`} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Week Select */}
          <select
            className="form-select form-select-sm rounded-pill"
            value={currentWeekOption ? currentWeekOption.value : weekOptions[0]?.value || ''}
            style={{ minWidth: '130px' }}
            onChange={(e) => {
              const selectedDate = new Date(e.target.value);
              setCurrentDate(selectedDate);
              handleonchange3month(selectedDate, item);
            }}
          >
            {weekOptions.map((opt, idx) => (
              <option key={`week-${idx}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
  } else if (item.layer_information.datetime_format === 'HOURLY') {
    console.log('HOURLY1');
    content = (
      <>
        <style>{`
          /* Light selects only inside this datepicker instance */
          .dp-light-selects .react-datepicker__month-select,
          .dp-light-selects .react-datepicker__year-select {
            background-color: #ffffff !important;
            color: #111827 !important;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            padding: 4px 5px 4px 5px;
          }

          /* Optional: make header and time list light as well */
          .dp-light-selects .react-datepicker__header {
            background-color: #ffffff !important;
          }
          .dp-light-selects .react-datepicker__time-container,
          .dp-light-selects .react-datepicker__time,
          .dp-light-selects .react-datepicker__time-box,
          .dp-light-selects .react-datepicker__time-list {
            background-color: #ffffff !important;
            color: #111827 !important;
          }
        `}</style>
        <DatePicker
          showIcon
          selected={currentDate}
          minDate={startDate ? new Date(startDate) : undefined}
          maxDate={endDate ? new Date(endDate) : undefined}
          onChange={(date) => handleChange(date, item)}
          showTimeSelect
          timeIntervals={60}
          timeCaption="Hour"
          dateFormat="yyyy/MM/dd HH:00"
          timeFormat='HH:00'
          className="customInput rounded-pill"
          popperPlacement="bottom-start"
          popperContainer={PortalDatePicker}
          // Month/Year selection
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
          scrollableYearDropdown
          yearDropdownItemNumber={50} // adjust as needed
          calendarClassName="dp-light-selects"
        />
      </>
    );
  } else if (item.layer_information.datetime_format === 'WEEKLY') {
    console.log('WEEKLY2');
    content = (
      <div style={{ width: '80%' }}>
        <select
          className="form-select form-select-sm rounded-pill"
          value={String(Number.isInteger(currentDate) ? currentDate : 0)}
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            handleChange(idx, item);
          }}
        >
          {weekRange && weekRange.map((wk, index) => (
            <option key={index} value={String(index)}>
              {wk} Week
            </option>
          ))}
        </select>
      </div>
    );
  } else if (item.layer_information.datetime_format === 'WFS_DAILY') {
    console.log('WFS_DAILY1');
    content = (
      <div style={{ paddingTop: 15, textAlign: 'center' }}>
        <p style={{ fontSize: 13, paddingLeft: 15, textAlign: 'left' }}>Date Range:</p>
        <DatePicker
          selected={starttoday}
          onChange={(date) => onChange(date, item)}
          minDate={startDateOrig}
          maxDate={endDateOrig}
          startDate={starttoday}
          endDate={end7day}
          selectsRange
          inline
          showDisabledMonthNavigation
          popperContainer={PortalDatePicker}
        />
      </div>
    );
  } else if (item.layer_information.datetime_format === '3MONTHLY_SEASONAL') {
    console.log('3MONTHLY_SEASONAL1');
    if (!dateArray.current || dateArray.current.length === 0 || !currentDate) {
      content = <div>Loading dates...</div>;
    } else {
      // Normalize all available dates to UTC midnight
      const parsedUTC = dateArray.current
        .map(d => new Date(d))
        .filter(d => !isNaN(d))
        .map(d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)));

      // Build year/month map using UTC parts
      const years = [...new Set(parsedUTC.map(d => d.getUTCFullYear()))].sort((a, b) => a - b);

      const monthsByYearMap = new Map();
      parsedUTC.forEach(d => {
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth();
        let arr = monthsByYearMap.get(y);
        if (!arr) {
          arr = [];
          monthsByYearMap.set(y, arr);
        }
        if (!arr.includes(m)) arr.push(m);
      });
      for (const [y, arr] of monthsByYearMap.entries()) {
        arr.sort((a, b) => a - b);
        monthsByYearMap.set(y, arr);
      }

      // Helper: get the correct day-of-month for a given UTC year/month from source data
      const dayFor = (y, m) => {
        const match = parsedUTC.find(d => d.getUTCFullYear() === y && d.getUTCMonth() === m);
        return match ? match.getUTCDate() : 1;
      };

      // Resolve currently selected year/month via UTC
      const curr = currentDate instanceof Date ? currentDate : new Date(currentDate);
      const yearToUse = years.includes(curr.getUTCFullYear()) ? curr.getUTCFullYear() : years[0];
      const monthsForYear = monthsByYearMap.get(yearToUse) || [];
      const monthToUse = monthsForYear.includes(curr.getUTCMonth())
        ? curr.getUTCMonth()
        : (monthsForYear[0] ?? 0);

      console.log('DateSelector 3MONTHLY_SEASONAL - Dropdown values:', {
        currentDate: curr,
        yearToUse,
        monthToUse,
        availableYears: years,
        availableMonthsForYear: monthsForYear
      });

      content = (
        <div style={{ width: '80%', display: 'flex', gap: '5px', marginLeft: -20 }}>
          {/* Year Select */}
          <select
            className="form-select form-select-sm rounded-pill"
            value={yearToUse}
            style={{ minWidth: '80px' }}
            onChange={(e) => {
              const selectedYear = parseInt(e.target.value, 10);
              const monthsForSelectedYear = monthsByYearMap.get(selectedYear) || [0];
              const firstMonth = monthsForSelectedYear[0] ?? 0;
              const day = dayFor(selectedYear, firstMonth);

              // Construct exact UTC midnight using the correct day from data
              const newDateUTC = new Date(Date.UTC(selectedYear, firstMonth, day, 0, 0, 0, 0));
              setCurrentDate(newDateUTC);
              handleonchange3monthSeasonal(newDateUTC, item);
            }}
          >
            {years.map((year) => (
              <option key={`year-${year}`} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Month Select (label shows prev - next month) */}
          <select
            className="form-select form-select-sm rounded-pill"
            value={monthToUse}
            style={{ minWidth: '120px' }}
            onChange={(e) => {
              const selectedMonth = parseInt(e.target.value, 10);
              const day = dayFor(yearToUse, selectedMonth);

              const newDateUTC = new Date(Date.UTC(yearToUse, selectedMonth, day, 0, 0, 0, 0));
              setCurrentDate(newDateUTC);
              handleonchange3monthSeasonal(newDateUTC, item);
            }}
          >
            {(monthsByYearMap.get(yearToUse) || []).map((m) => {
              const prev = new Date(Date.UTC(yearToUse, m - 1, 1));
              const next = new Date(Date.UTC(yearToUse, m + 1, 1));
              const label = `${prev.toLocaleString('default', { month: 'short' })} - ${next.toLocaleString('default', { month: 'short' })}`;
              return (
                <option key={`month-${m}`} value={m}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      );
    }
  } else {
    content = <div>Default Content</div>;
  }

  return (
    <div className="row align-items-center" style={{ marginTop: '-5px', marginBottom: '8px', paddingTop: 8 }}>
      {item.layer_information.datetime_format !== 'WFS_DAILY' && (
        <div className="col-sm-4">
          <style>{`
            select.form-select.form-select-sm.rounded-pill {
              background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23000000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
            }
            body.dark-mode select.form-select.form-select-sm.rounded-pill {
              background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23FFFFFF' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
            }
          `}</style>
          <div className="date-selector-label">Date Range:</div>
        </div>
      )}
      <div className={item.layer_information.datetime_format === 'WFS_DAILY' ? 'col-sm-12' : 'col-sm-8'}>
        {content}
      </div>
    </div>
  );
}

export default DateSelector;