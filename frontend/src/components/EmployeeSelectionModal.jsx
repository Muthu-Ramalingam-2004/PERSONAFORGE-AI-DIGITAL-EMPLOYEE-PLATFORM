import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployee } from '../context/EmployeeContext';
import { Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmployeeSelectionModal = () => {
  const { isSelectionModalOpen, setIsSelectionModalOpen } = useEmployee();
  const navigate = useNavigate();

  const handleGoToEmployees = () => {
    setIsSelectionModalOpen(false);
    navigate('/employees');
  };

  return (
    <AnimatePresence>
      {isSelectionModalOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSelectionModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-bg-secondary border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-hidden"
            >
              {/* Top decoration */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary-hover/50" />

              {/* Close Button */}
              <button
                onClick={() => setIsSelectionModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary hover:bg-bg-tertiary p-1.5 rounded-lg transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Icon & Message */}
              <div className="text-center mt-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary mx-auto mb-5 shadow-inner shadow-primary/5 animate-pulse">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-text-primary tracking-tight">
                  Please select an AI Employee.
                </h3>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                  To view or manage the Knowledge Base and Prompt configurations, you must select an active digital worker from the employee directory.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={handleGoToEmployees}
                  className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-bold py-3 px-4 rounded-xl shadow-md shadow-primary/15 transition duration-150 transform active:scale-98"
                >
                  Go to AI Employees
                </button>
                <button
                  onClick={() => setIsSelectionModalOpen(false)}
                  className="w-full bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-sm font-semibold py-3 px-4 rounded-xl border border-border transition duration-150"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EmployeeSelectionModal;
