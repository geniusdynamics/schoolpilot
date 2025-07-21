// ABOUTME: Demo component showcasing the Form Validation Framework
// ABOUTME: Demonstrates real-time validation, debouncing, and error handling

import React from 'react';
import useFormValidation, { validators } from '../hooks/useFormValidation';
import Input from './ui/Input';
import Button from './ui/Button';

const FormValidationDemo: React.FC = () => {
  const {
    formData,
    getFieldProps,
    handleSubmit,
    isValid,
    isSubmitting,
    resetForm,
  } = useFormValidation({
    email: {
      rules: [validators.email()],
      required: true,
      requiredMessage: 'Email is required',
    },
    name: {
      rules: [validators.minLength(2, 'Name must be at least 2 characters')],
      required: true,
      requiredMessage: 'Name is required',
    },
    age: {
      rules: [
        validators.numeric('Please enter a valid number'),
        validators.min(0, 'Age must be positive'),
        validators.max(120, 'Age must be realistic'),
      ],
    },
    password: {
      rules: [
        validators.minLength(8, 'Password must be at least 8 characters'),
        validators.custom(
          (value: string) => /[A-Z]/.test(value),
          'Password must contain at least one uppercase letter'
        ),
        validators.custom(
          (value: string) => /[0-9]/.test(value),
          'Password must contain at least one number'
        ),
      ],
      required: true,
    },
  });

  const onSubmit = async (data: any) => {
    console.log('Form submitted:', data);
    alert('Form submitted successfully!');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Form Validation Demo</h2>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(onSubmit);
      }} className="space-y-4">
        
        <Input
          {...getFieldProps('name')}
          label="Full Name"
          placeholder="Enter your full name"
        />

        <Input
          {...getFieldProps('email')}
          label="Email Address"
          type="email"
          placeholder="Enter your email"
        />

        <Input
          {...getFieldProps('age')}
          label="Age (Optional)"
          type="number"
          placeholder="Enter your age"
        />

        <Input
          {...getFieldProps('password')}
          label="Password"
          type="password"
          placeholder="Enter a strong password"
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!isValid}
            className="flex-1"
          >
            Submit Form
          </Button>
          
          <Button
            type="button"
            variant="secondary"
            onClick={() => resetForm()}
            disabled={isSubmitting}
          >
            Reset
          </Button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Form State:</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Valid: {isValid ? '✅' : '❌'}</div>
          <div>Submitting: {isSubmitting ? '⏳' : '✅'}</div>
          <div>Data: {JSON.stringify(formData, null, 2)}</div>
        </div>
      </div>
    </div>
  );
};

export default FormValidationDemo;