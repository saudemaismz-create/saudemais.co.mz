
import { Medication, Pharmacy } from '../types';

export const calculateDistance = (loc1: { lat: number; lng: number }, loc2?: { lat: number; lng: number }) => {
  if (!loc2) return 999999;
  // Simple Euclidean distance for MVP (enough for town scale)
  return Math.sqrt(Math.pow(loc1.lat - loc2.lat, 2) + Math.pow(loc1.lng - loc2.lng, 2));
};

export const getSmartRankedMedications = (
  meds: Medication[],
  pharmacies: Pharmacy[],
  userLocation?: { lat: number; lng: number }
) => {
  return [...meds].sort((a, b) => {
    // Basic defensive checks
    const valA = a?.price ?? 0;
    const valB = b?.price ?? 0;

    // 1. Price (Primary - Lower is better)
    if (valA !== valB) return valA - valB;

    // 2. Stock (Secondary - Higher is better)
    const stockA = a.stock ?? 0;
    const stockB = b.stock ?? 0;
    if (stockA !== stockB) return stockB - stockA;

    // Get associated pharmacies
    // We assume medication was either listed by a pharmacy or we pick its primary/first listed
    const farmIdA = a.pharmacyId || a.availableAt?.[0];
    const farmIdB = b.pharmacyId || b.availableAt?.[0];
    
    const phA = pharmacies.find(p => p.id === farmIdA);
    const phB = pharmacies.find(p => p.id === farmIdB);

    if (userLocation && phA && phB) {
      // 3. Proximity
      const distA = calculateDistance(userLocation, phA.location);
      const distB = calculateDistance(userLocation, phB.location);
      if (Math.abs(distA - distB) > 0.001) { // Only if meaningful difference
        return distA - distB;
      }

      // 4. Response Rate (Higher is better)
      const respA = phA.responseRate ?? 0;
      const respB = phB.responseRate ?? 0;
      if (respA !== respB) return respB - respA;

      // 5. Delivery Speed (Lower is better)
      const speedA = phA.deliveryTime ?? 999;
      const speedB = phB.deliveryTime ?? 999;
      return speedA - speedB;
    }

    return 0;
  });
};
