// ABOUTME: Deprecated — school configuration has been split into SchoolOrganizationPage and StudentLifePage
// ABOUTME: This page now redirects to SchoolOrganizationPage

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SchoolConfigurationPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/administration/organization', { replace: true });
  }, [navigate]);

  return null;
};

export default SchoolConfigurationPage;
