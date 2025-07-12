import { useAppData } from '../../../contexts/AppDataContext';

export const useTransportRouteData = () => {
  const { transportroutes, addTransportRoute, updateTransportRoute, deleteTransportRoute } = useAppData();
  
  return {
    data: transportroutes,
    create: addTransportRoute,
    update: updateTransportRoute,
    remove: deleteTransportRoute
  };
};
