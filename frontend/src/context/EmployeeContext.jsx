import React, { createContext, useContext, useState } from 'react';

const EmployeeContext = createContext();

export const EmployeeProvider = ({ children }) => {
  const [selectedEmployee, setSelectedEmployeeState] = useState(() => {
    try {
      const persisted = localStorage.getItem('selectedEmployee');
      return persisted ? JSON.parse(persisted) : null;
    } catch (e) {
      return null;
    }
  });

  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  const setSelectedEmployee = (employee) => {
    setSelectedEmployeeState(employee);
    if (employee) {
      localStorage.setItem('selectedEmployee', JSON.stringify(employee));
    } else {
      localStorage.removeItem('selectedEmployee');
    }
  };

  const clearSelectedEmployee = () => {
    setSelectedEmployeeState(null);
    localStorage.removeItem('selectedEmployee');
  };

  return (
    <EmployeeContext.Provider
      value={{
        selectedEmployee,
        setSelectedEmployee,
        clearSelectedEmployee,
        isSelectionModalOpen,
        setIsSelectionModalOpen
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
};
