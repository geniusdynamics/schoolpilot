// ABOUTME: Demo component showcasing DatePicker functionality with various configurations
// ABOUTME: Includes single date, date range, validation, and accessibility examples

import React, { useState } from 'react';
import DatePicker from '../ui/forms/DatePicker';

const DatePickerDemo: React.FC = () => {
  const [singleDate, setSingleDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [validatedDate, setValidatedDate] = useState<Date | null>(null);
  const [dateError, setDateError] = useState<string>('');

  // Validation for business days only
  const validateBusinessDay = (date: Date | null) => {
    if (!date) {
      setDateError('');
      return;
    }

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setDateError('Please select a business day (Monday-Friday)');
    } else {
      setDateError('');
    }
  };

  const handleValidatedDateChange = (date: Date | null) => {
    setValidatedDate(date);
    validateBusinessDay(date);
  };

  // Generate some disabled dates (weekends in current month)
  const getDisabledDates = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 0 || date.getDay() === 6) {
        dates.push(date);
      }
    }
    return dates;
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DatePicker Component Demo</h1>
        <p className="text-gray-600">
          Modern date picker with calendar interface, keyboard navigation, and accessibility support
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Date Picker */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Basic Date Picker</h2>
          <div className="space-y-4">
            <DatePicker
              value={singleDate}
              onChange={setSingleDate}
              placeholder="Select a date"
              aria-label="Basic date picker"
            />
            <div className="text-sm text-gray-600">
              Selected: {singleDate ? singleDate.toLocaleDateString() : 'None'}
            </div>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Date Range Picker</h2>
          <div className="space-y-4">
            <DatePicker
              isRange
              rangeValue={dateRange}
              onRangeChange={setDateRange}
              placeholder="Select date range"
              aria-label="Date range picker"
            />
            <div className="text-sm text-gray-600">
              Range: {dateRange[0] && dateRange[1] 
                ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`
                : dateRange[0] 
                  ? `${dateRange[0].toLocaleDateString()} - (select end date)`
                  : 'None'
              }
            </div>
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Size Variants</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Small</label>
              <DatePicker
                size="sm"
                placeholder="Small date picker"
                aria-label="Small date picker"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medium (Default)</label>
              <DatePicker
                size="md"
                placeholder="Medium date picker"
                aria-label="Medium date picker"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Large</label>
              <DatePicker
                size="lg"
                placeholder="Large date picker"
                aria-label="Large date picker"
              />
            </div>
          </div>
        </div>

        {/* Variant Styles */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Style Variants</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Outlined (Default)</label>
              <DatePicker
                variant="outlined"
                placeholder="Outlined style"
                aria-label="Outlined date picker"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filled</label>
              <DatePicker
                variant="filled"
                placeholder="Filled style"
                aria-label="Filled date picker"
              />
            </div>
          </div>
        </div>

        {/* Validation and Error States */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Validation & States</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Days Only
              </label>
              <DatePicker
                value={validatedDate}
                onChange={handleValidatedDateChange}
                placeholder="Select business day"
                error={dateError}
                aria-label="Business day date picker"
                aria-describedby="business-day-help"
              />
              <p id="business-day-help" className="mt-1 text-xs text-gray-500">
                Only Monday through Friday are allowed
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Success State</label>
              <DatePicker
                value={new Date()}
                success
                placeholder="Success state"
                aria-label="Success state date picker"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disabled State</label>
              <DatePicker
                disabled
                placeholder="Disabled date picker"
                aria-label="Disabled date picker"
              />
            </div>
          </div>
        </div>

        {/* Date Restrictions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Date Restrictions</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Future Dates Only
              </label>
              <DatePicker
                minDate={new Date()}
                placeholder="Future dates only"
                aria-label="Future dates date picker"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weekends Disabled
              </label>
              <DatePicker
                disabledDates={getDisabledDates()}
                placeholder="No weekends"
                aria-label="Weekdays only date picker"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range Limit (Next 30 Days)
              </label>
              <DatePicker
                minDate={new Date()}
                maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                placeholder="Next 30 days only"
                aria-label="Limited range date picker"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Accessibility Features</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>• <strong>Keyboard Navigation:</strong> Use Tab to focus, Enter/Space to open, Arrow keys to navigate dates</li>
          <li>• <strong>Screen Reader Support:</strong> Proper ARIA labels, announcements, and semantic markup</li>
          <li>• <strong>Focus Management:</strong> Focus returns to input after selection, clear focus indicators</li>
          <li>• <strong>High Contrast:</strong> Meets WCAG 2.1 AA contrast requirements</li>
          <li>• <strong>Touch Support:</strong> Mobile-responsive with touch-optimized interactions</li>
          <li>• <strong>Error Handling:</strong> Clear error messages with proper ARIA associations</li>
        </ul>
      </div>

      {/* Usage Examples */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Usage Examples</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-800">Basic Usage:</h4>
            <pre className="mt-1 p-3 bg-white rounded border text-xs overflow-x-auto">
{`<DatePicker
  value={date}
  onChange={setDate}
  placeholder="Select date"
/>`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800">Date Range:</h4>
            <pre className="mt-1 p-3 bg-white rounded border text-xs overflow-x-auto">
{`<DatePicker
  isRange
  rangeValue={dateRange}
  onRangeChange={setDateRange}
  placeholder="Select date range"
/>`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800">With Validation:</h4>
            <pre className="mt-1 p-3 bg-white rounded border text-xs overflow-x-auto">
{`<DatePicker
  value={date}
  onChange={setDate}
  error={error}
  minDate={new Date()}
  disabledDates={weekends}
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePickerDemo;