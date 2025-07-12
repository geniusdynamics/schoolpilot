import { useAppData } from '../../../contexts/AppDataContext';

export const useWarehouseData = () => {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse } = useAppData();
  
  return {
    data: warehouses,
    create: addWarehouse,
    update: updateWarehouse,
    remove: deleteWarehouse
  };
};
