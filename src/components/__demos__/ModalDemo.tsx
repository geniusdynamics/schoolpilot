// ABOUTME: Demo component showcasing the enhanced Modal system
// ABOUTME: Examples of different modal variants, sizes, and features

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useModal } from '../../hooks/useModal';

const ModalDemo: React.FC = () => {
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [drawerModalOpen, setDrawerModalOpen] = useState(false);
  const [loadingModalOpen, setLoadingModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  // Simulate loading
  const handleLoadingDemo = () => {
    setLoadingModalOpen(true);
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      setFormModalOpen(false);
      setFormData({ name: '', email: '' });
    }, 2000);
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Modal System</h1>
        <p className="text-gray-600 mb-8">
          Modern modal components with smooth animations, focus management, and responsive design.
        </p>
      </div>

      {/* Modal Variants */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modal Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button onClick={() => setBasicModalOpen(true)}>
            Basic Modal
          </Button>
          
          <Button onClick={() => setDrawerModalOpen(true)} variant="secondary">
            Drawer Modal
          </Button>
          
          <Button onClick={handleLoadingDemo} variant="outline">
            Loading Modal
          </Button>
        </div>
      </section>

      {/* Modal Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modal Sizes</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {(['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const).map((size) => (
            <SizeModal key={size} size={size} />
          ))}
        </div>
      </section>

      {/* Interactive Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Interactive Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={() => setConfirmModalOpen(true)} variant="danger">
            Confirmation Dialog
          </Button>
          
          <Button onClick={() => setFormModalOpen(true)} variant="primary">
            Form Modal
          </Button>
        </div>
      </section>

      {/* Basic Modal */}
      <Modal
        isOpen={basicModalOpen}
        onClose={() => setBasicModalOpen(false)}
        title="Basic Modal"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            This is a basic modal with smooth animations and proper focus management.
            Try pressing the Escape key or clicking outside to close it.
          </p>
          <p className="text-gray-600">
            The modal includes backdrop blur effects and prevents body scrolling
            while open. It's fully accessible with proper ARIA attributes.
          </p>
        </div>
      </Modal>

      {/* Drawer Modal */}
      <Modal
        isOpen={drawerModalOpen}
        onClose={() => setDrawerModalOpen(false)}
        title="Drawer Modal"
        variant="drawer"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            This is a drawer modal that slides in from the right side.
            Perfect for forms, settings, or detailed views.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sample Input
              </label>
              <Input placeholder="Enter some text..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Another Input
              </label>
              <Input placeholder="More text..." />
            </div>
          </div>
        </div>
      </Modal>

      {/* Loading Modal */}
      <Modal
        isOpen={loadingModalOpen}
        onClose={() => setLoadingModalOpen(false)}
        title="Processing Request"
        loading={loading}
        preventClose={loading}
        showCloseButton={!loading}
      >
        <div className="text-center py-4">
          <p className="text-gray-600">
            This modal shows a loading state and prevents closing while processing.
          </p>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Action"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmModalOpen(false)}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <p className="text-gray-600">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Form Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="User Information"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setFormModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleFormSubmit}
              loading={loading}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Size Modal Component
const SizeModal: React.FC<{ size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' }> = ({ size }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        {size.toUpperCase()}
      </Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`${size.toUpperCase()} Modal`}
        size={size}
      >
        <div className="py-4">
          <p className="text-gray-600">
            This is a {size} sized modal. The modal automatically adapts to different
            screen sizes and provides optimal viewing experience.
          </p>
        </div>
      </Modal>
    </>
  );
};

export default ModalDemo;