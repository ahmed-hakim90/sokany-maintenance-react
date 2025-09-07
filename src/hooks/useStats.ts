import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

type Stats = {
  totalSales: number;
  totalMaintenanceRequests: number;
  totalProducts: number;
  totalTransfers: number;
};

export default function useStats(centerId?: string | null) {
  const [stats, setStats] = useState<Stats>({ totalSales: 0, totalMaintenanceRequests: 0, totalProducts: 0, totalTransfers: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // total sales
      const { data: salesData, error: salesError } = await supabase.rpc('sum_total_sales', { center_id: centerId || null });
      if (salesError) throw salesError;
      const totalSales = (salesData && salesData[0] && salesData[0].sum) ? Number(salesData[0].sum) : 0;

      // maintenance requests count
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact' })
        .eq(centerId ? 'center_id' : 'is_not_null', centerId || true);
      if (maintenanceError) throw maintenanceError;
      const totalMaintenanceRequests = maintenanceData ? maintenanceData.length : 0;

      // products count
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq(centerId ? 'center_id' : 'is_not_null', centerId || true);
      if (productsError) throw productsError;
      const totalProducts = productsData ? productsData.length : 0;

      // transfers count
      const { data: transfersData, error: transfersError } = await supabase
        .from('transfers')
        .select('id', { count: 'exact' })
        .eq(centerId ? 'from_center_id' : 'is_not_null', centerId || true);
      if (transfersError) throw transfersError;
      const totalTransfers = transfersData ? transfersData.length : 0;

      setStats({ totalSales, totalMaintenanceRequests, totalProducts, totalTransfers });
      setError(null);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    fetchStats();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dataVersion') fetchStats();
    };
    window.addEventListener('storage', onStorage as any);
    return () => window.removeEventListener('storage', onStorage as any);
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}
