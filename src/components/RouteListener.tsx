import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RouteListener: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem('lastPath', location.pathname + location.search);
    } catch (e) {
      // ignore localStorage failures
    }
  }, [location]);

  return null;
};

export default RouteListener;
