import { createDomainContext } from './createDomainContext';
import { DOMAIN_GROUPS } from './domainConfig';

export const { 
  DomainProvider: CoreDomainProvider, 
  useDomainContext: useCoreDomain 
} = createDomainContext<any>('Core', DOMAIN_GROUPS.core);

export const { 
  DomainProvider: AcademicsDomainProvider, 
  useDomainContext: useAcademicsDomain 
} = createDomainContext<any>('Academics', DOMAIN_GROUPS.academics);

export const { 
  DomainProvider: HRDomainProvider, 
  useDomainContext: useHRDomain 
} = createDomainContext<any>('HR', DOMAIN_GROUPS.hr);

export const { 
  DomainProvider: FinanceDomainProvider, 
  useDomainContext: useFinanceDomain 
} = createDomainContext<any>('Finance', DOMAIN_GROUPS.finance);

export const { 
  DomainProvider: InventoryDomainProvider, 
  useDomainContext: useInventoryDomain 
} = createDomainContext<any>('Inventory', DOMAIN_GROUPS.inventory);

export const { 
  DomainProvider: SharedDomainProvider, 
  useDomainContext: useSharedDomain 
} = createDomainContext<any>('Shared', DOMAIN_GROUPS.shared);

export const DomainProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CoreDomainProvider>
      <AcademicsDomainProvider>
        <HRDomainProvider>
          <FinanceDomainProvider>
            <InventoryDomainProvider>
              <SharedDomainProvider>
                {children}
              </SharedDomainProvider>
            </InventoryDomainProvider>
          </FinanceDomainProvider>
        </HRDomainProvider>
      </AcademicsDomainProvider>
    </CoreDomainProvider>
  );
};
