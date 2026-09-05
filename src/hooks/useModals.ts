import { useState, useCallback } from 'react';
import type { Contract, Project, RealContract } from '../utils/types';

interface ModalState {
  detailsContract: Contract | null;
  priceContract: Contract | null;
  alertProject: Project | null;
  aiContract: Contract | null;
  secopOpen: boolean;
  minorOpen: boolean;
  interOpen: boolean;
  housingOpen: boolean;
  searchOpen: boolean;
  comparisonOpen: boolean;
  entityOpen: boolean;
  alertsOpen: boolean;
  entityName: string;
  selectedRealContract: RealContract | null;
}

const initialState: ModalState = {
  detailsContract: null,
  priceContract: null,
  alertProject: null,
  aiContract: null,
  secopOpen: false,
  minorOpen: false,
  interOpen: false,
  housingOpen: false,
  searchOpen: false,
  comparisonOpen: false,
  entityOpen: false,
  alertsOpen: false,
  entityName: '',
  selectedRealContract: null,
};

export function useModals() {
  const [state, setState] = useState<ModalState>(initialState);

  const openDetails = useCallback((contract: Contract) => {
    setState((s) => ({ ...s, detailsContract: contract }));
  }, []);

  const closeDetails = useCallback(() => {
    setState((s) => ({ ...s, detailsContract: null }));
  }, []);

  const openPriceComparison = useCallback((contract: Contract) => {
    setState((s) => ({ ...s, detailsContract: null, priceContract: contract }));
  }, []);

  const closePriceComparison = useCallback(() => {
    setState((s) => ({ ...s, priceContract: null }));
  }, []);

  const openAlert = useCallback((project: Project) => {
    setState((s) => ({ ...s, alertProject: project }));
  }, []);

  const closeAlert = useCallback(() => {
    setState((s) => ({ ...s, alertProject: null }));
  }, []);

  const openSecop = useCallback(() => {
    setState((s) => ({ ...s, secopOpen: true }));
  }, []);

  const closeSecop = useCallback(() => {
    setState((s) => ({ ...s, secopOpen: false }));
  }, []);

  const openMinor = useCallback(() => {
    setState((s) => ({ ...s, minorOpen: true }));
  }, []);

  const closeMinor = useCallback(() => {
    setState((s) => ({ ...s, minorOpen: false }));
  }, []);

  const openInter = useCallback(() => {
    setState((s) => ({ ...s, interOpen: true }));
  }, []);

  const closeInter = useCallback(() => {
    setState((s) => ({ ...s, interOpen: false }));
  }, []);

  const openHousing = useCallback(() => {
    setState((s) => ({ ...s, housingOpen: true }));
  }, []);

  const closeHousing = useCallback(() => {
    setState((s) => ({ ...s, housingOpen: false }));
  }, []);

  const openSearch = useCallback(() => {
    setState((s) => ({ ...s, searchOpen: true }));
  }, []);

  const closeSearch = useCallback(() => {
    setState((s) => ({ ...s, searchOpen: false }));
  }, []);

  const openComparison = useCallback((contract?: RealContract) => {
    setState((s) => ({ ...s, comparisonOpen: true, selectedRealContract: contract || null }));
  }, []);

  const closeComparison = useCallback(() => {
    setState((s) => ({ ...s, comparisonOpen: false, selectedRealContract: null }));
  }, []);

  const openAI = useCallback((contract: Contract) => {
    setState((s) => ({ ...s, aiContract: contract }));
  }, []);

  const closeAI = useCallback(() => {
    setState((s) => ({ ...s, aiContract: null }));
  }, []);

  const openAlerts = useCallback(() => {
    setState((s) => ({ ...s, alertsOpen: true }));
  }, []);

  const closeAlerts = useCallback(() => {
    setState((s) => ({ ...s, alertsOpen: false }));
  }, []);

  const openEntity = useCallback((entityName: string) => {
    setState((s) => ({ ...s, entityOpen: true, entityName }));
  }, []);

  const closeEntity = useCallback(() => {
    setState((s) => ({ ...s, entityOpen: false, entityName: '' }));
  }, []);

  return {
    ...state,
    openDetails,
    closeDetails,
    openPriceComparison,
    closePriceComparison,
    openAlert,
    closeAlert,
    openSecop,
    closeSecop,
    openMinor,
    closeMinor,
    openInter,
    closeInter,
    openHousing,
    closeHousing,
    openSearch,
    closeSearch,
    openComparison,
    closeComparison,
    openAI,
    closeAI,
    openAlerts,
    closeAlerts,
    openEntity,
    closeEntity,
  };
}
