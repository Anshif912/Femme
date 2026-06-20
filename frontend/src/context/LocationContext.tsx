import React, { createContext, useContext, useEffect, useState } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

interface LocationContextProps {
  location: LocationData | null;
  setLocation: React.Dispatch<React.SetStateAction<LocationData | null>>;
  permissionDenied: boolean;
  setPermissionDenied: React.Dispatch<React.SetStateAction<boolean>>;
}

const LocationContext = createContext<LocationContextProps | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      setPermissionDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation({ latitude, longitude, accuracy, timestamp: pos.timestamp });
        setPermissionDenied(false);
        localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude, accuracy, timestamp: pos.timestamp }));
      },
      (err) => {
        console.error('Location permission denied:', err);
        setPermissionDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <LocationContext.Provider value={{ location, setLocation, permissionDenied, setPermissionDenied }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
