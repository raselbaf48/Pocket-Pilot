import React, { useState, useMemo } from 'react';
import {
  Bike,
  Fuel,
  Wrench,
  Bell,
  Plus,
  Trash2,
  Calendar,
  Gauge,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  DollarSign,
  Droplet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Vehicle, FuelLog, BikeServiceLog, BikeReminder } from '../../types';
import { formatTaka, formatDateDDMMMYY, toISODate, getDaysDifference } from '../../utils/format';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

export const BikeModule: React.FC = () => {
  const {
    data,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addFuelLog,
    deleteFuelLog,
    addServiceLog,
    deleteServiceLog,
    addBikeReminder,
    toggleBikeReminder,
    deleteBikeReminder
  } = useApp();

  const activeVehicles = useMemo(() => {
    return data.vehicles.filter(v => !v.deleted);
  }, [data.vehicles]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    return activeVehicles[0]?.id || '';
  });

  const currentVehicle = useMemo(() => {
    return activeVehicles.find(v => v.id === selectedVehicleId) || activeVehicles[0] || null;
  }, [activeVehicles, selectedVehicleId]);

  // Sub-tabs: 'fuel' | 'service' | 'reminders' | 'analytics'
  const [activeSubTab, setActiveSubTab] = useState<'fuel' | 'service' | 'reminders' | 'analytics'>('fuel');

  // Modals state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const [deletingFuelId, setDeletingFuelId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

  // Fuel Form state
  const [fuelDate, setFuelDate] = useState(toISODate());
  const [fuelOdometer, setFuelOdometer] = useState(currentVehicle ? currentVehicle.currentOdo.toString() : '');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('130'); // Standard Octane in BD
  const [fuelTotalCost, setFuelTotalCost] = useState('');
  const [fuelIsFullTank, setFuelIsFullTank] = useState(true);
  const [fuelNotes, setFuelNotes] = useState('');

  // Service Form state
  const [serviceDate, setServiceDate] = useState(toISODate());
  const [serviceOdometer, setServiceOdometer] = useState(currentVehicle ? currentVehicle.currentOdo.toString() : '');
  const [serviceType, setServiceType] = useState('Engine Oil');
  const [serviceCost, setServiceCost] = useState('');
  const [serviceWorkshop, setServiceWorkshop] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  // Reminder Form state
  const [remTitle, setRemTitle] = useState('Engine Oil Change (10W-40)');
  const [remType, setRemType] = useState<'odometer' | 'date' | 'both'>('odometer');
  const [remTargetOdo, setRemTargetOdo] = useState('');
  const [remTargetDate, setRemTargetDate] = useState('');
  const [remNotes, setRemNotes] = useState('');

  // Vehicle Form state
  const [vehName, setVehName] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehRegNumber, setVehRegNumber] = useState('');
  const [vehCurrentOdo, setVehCurrentOdo] = useState('');

  // Filter logs for selected vehicle
  const vehicleFuelLogs = useMemo(() => {
    if (!currentVehicle) return [];
    return data.fuelLogs
      .filter(f => !f.deleted && f.vehicleId === currentVehicle.id)
      .sort((a, b) => b.odometer - a.odometer || new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.fuelLogs, currentVehicle]);

  const vehicleServiceLogs = useMemo(() => {
    if (!currentVehicle) return [];
    return data.serviceLogs
      .filter(s => !s.deleted && s.vehicleId === currentVehicle.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.serviceLogs, currentVehicle]);

  const vehicleReminders = useMemo(() => {
    if (!currentVehicle) return [];
    return data.bikeReminders
      .filter(r => !r.deleted && r.vehicleId === currentVehicle.id)
      .sort((a, b) => (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0));
  }, [data.bikeReminders, currentVehicle]);

  // Compute fuel efficiency stats (Fuelio algorithm)
  // Distance since last fill = current odo - prev odo
  // km/l = (current odo - prev odo) / liters (when consecutive full tanks)
  const computedFuelLogs = useMemo(() => {
    // Sort chronological
    const sortedAsc = [...vehicleFuelLogs].sort((a, b) => a.odometer - b.odometer);
    const resultMap = new Map<string, { distance: number; kmpl: number | null; costPerKm: number | null }>();

    for (let i = 0; i < sortedAsc.length; i++) {
      const current = sortedAsc[i];
      if (i === 0) {
        resultMap.set(current.id, { distance: 0, kmpl: null, costPerKm: null });
        continue;
      }
      const prev = sortedAsc[i - 1];
      const dist = Math.max(0, current.odometer - prev.odometer);
      let kmpl: number | null = null;
      let costPerKm: number | null = null;

      if (current.isFullTank && prev.isFullTank && current.liters > 0 && dist > 0) {
        kmpl = dist / current.liters;
        costPerKm = current.totalCost / dist;
      }

      resultMap.set(current.id, { distance: dist, kmpl, costPerKm });
    }

    return resultMap;
  }, [vehicleFuelLogs]);

  // Aggregates
  const totalFuelCost = vehicleFuelLogs.reduce((sum, f) => sum + f.totalCost, 0);
  const totalFuelLiters = vehicleFuelLogs.reduce((sum, f) => sum + f.liters, 0);
  const totalServiceCost = vehicleServiceLogs.reduce((sum, s) => sum + s.cost, 0);
  const totalBikeCost = totalFuelCost + totalServiceCost;

  // Average km/l calculation across all full tanks
  const validKmpls = Array.from(computedFuelLogs.values())
    .map(v => v.kmpl)
    .filter((k): k is number => k !== null && k > 10 && k < 100);
  const avgKmpl = validKmpls.length > 0 ? validKmpls.reduce((a, b) => a + b, 0) / validKmpls.length : null;

  // Running cost per km
  const minOdo = vehicleFuelLogs.length > 0 ? Math.min(...vehicleFuelLogs.map(f => f.odometer)) : 0;
  const maxOdo = currentVehicle ? currentVehicle.currentOdo : 0;
  const totalTrackedDistance = maxOdo > minOdo ? maxOdo - minOdo : 0;
  const avgCostPerKm = totalTrackedDistance > 0 ? totalBikeCost / totalTrackedDistance : null;

  // Handlers
  const handleFuelLitersChange = (l: string) => {
    setFuelLiters(l);
    const lNum = parseFloat(l);
    const pNum = parseFloat(fuelPricePerLiter);
    if (!isNaN(lNum) && !isNaN(pNum)) {
      setFuelTotalCost((lNum * pNum).toFixed(0));
    }
  };

  const handleFuelPriceChange = (p: string) => {
    setFuelPricePerLiter(p);
    const lNum = parseFloat(fuelLiters);
    const pNum = parseFloat(p);
    if (!isNaN(lNum) && !isNaN(pNum)) {
      setFuelTotalCost((lNum * pNum).toFixed(0));
    }
  };

  const handleSaveFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle) return;
    const odo = parseInt(fuelOdometer, 10);
    const ltr = parseFloat(fuelLiters);
    const price = parseFloat(fuelPricePerLiter);
    const total = parseFloat(fuelTotalCost) || ltr * price;

    addFuelLog({
      vehicleId: currentVehicle.id,
      date: fuelDate,
      odometer: odo,
      liters: ltr,
      pricePerLiter: price,
      totalCost: total,
      isFullTank: fuelIsFullTank,
      notes: fuelNotes.trim() || undefined,
    });
    setIsFuelModalOpen(false);
    setFuelLiters('');
    setFuelTotalCost('');
    setFuelNotes('');
  };

  const handleSaveServiceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle) return;
    const odo = parseInt(serviceOdometer, 10);
    const cost = parseFloat(serviceCost);

    addServiceLog({
      vehicleId: currentVehicle.id,
      date: serviceDate,
      odometer: odo,
      serviceType,
      cost,
      workshop: serviceWorkshop.trim() || undefined,
      notes: serviceNotes.trim() || undefined,
    });
    setIsServiceModalOpen(false);
    setServiceCost('');
    setServiceWorkshop('');
    setServiceNotes('');
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle) return;
    const targetOdoNum = parseInt(remTargetOdo, 10);

    addBikeReminder({
      vehicleId: currentVehicle.id,
      title: remTitle.trim(),
      reminderType: remType,
      targetOdometer: !isNaN(targetOdoNum) ? targetOdoNum : undefined,
      targetDate: remTargetDate || undefined,
      isCompleted: false,
      notes: remNotes.trim() || undefined,
    });
    setIsReminderModalOpen(false);
    setRemTargetOdo('');
    setRemTargetDate('');
    setRemNotes('');
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const odo = parseInt(vehCurrentOdo, 10) || 0;
    addVehicle({
      name: vehName.trim(),
      model: vehModel.trim(),
      regNumber: vehRegNumber.trim(),
      currentOdo: odo,
    });
    setIsVehicleModalOpen(false);
    setVehName('');
    setVehModel('');
    setVehRegNumber('');
    setVehCurrentOdo('');
  };

  const todayStr = toISODate();

  return (
    <div className="space-y-6 pb-20">
      {/* Vehicle Switcher & Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-100">
                {currentVehicle ? currentVehicle.name : 'No Vehicle Added'}
              </h2>
              {activeVehicles.length > 1 && (
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  {activeVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              )}
            </div>
            {currentVehicle && (
              <p className="text-xs text-slate-400 mt-0.5">
                {currentVehicle.model} • <span className="font-mono">{currentVehicle.regNumber}</span> • Odometer: <span className="font-bold text-teal-400">{currentVehicle.currentOdo.toLocaleString()} km</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            + Vehicle
          </button>
          <button
            onClick={() => {
              if (currentVehicle) setFuelOdometer(currentVehicle.currentOdo.toString());
              setIsFuelModalOpen(true);
            }}
            className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition flex items-center gap-1.5"
          >
            <Fuel className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Fill-up</span>
          </button>
          <button
            onClick={() => {
              if (currentVehicle) setServiceOdometer(currentVehicle.currentOdo.toString());
              setIsServiceModalOpen(true);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold border border-teal-500/30 transition flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>+ Service</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Average Mileage</span>
          <div className="text-xl font-extrabold text-cyan-300 font-mono mt-1">
            {avgKmpl ? `${avgKmpl.toFixed(1)} km/l` : '—'}
          </div>
          <span className="text-[10px] text-slate-500">From full-tank logs</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Running Cost / km</span>
          <div className="text-xl font-extrabold text-teal-300 font-mono mt-1">
            {avgCostPerKm ? formatTaka(avgCostPerKm, true) : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Fuel & maintenance</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Total Fuel Spent</span>
          <div className="text-xl font-extrabold text-slate-100 font-mono mt-1">
            {formatTaka(totalFuelCost)}
          </div>
          <span className="text-[10px] text-slate-500">{totalFuelLiters.toFixed(1)} Liters logged</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Service & Maintenance</span>
          <div className="text-xl font-extrabold text-amber-300 font-mono mt-1">
            {formatTaka(totalServiceCost)}
          </div>
          <span className="text-[10px] text-slate-500">{vehicleServiceLogs.length} service records</span>
        </div>
      </div>

      {/* Sub Tabs: Fuel Log, Service Log, Reminders, Analytics */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('fuel')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeSubTab === 'fuel'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Fuel Logs ({vehicleFuelLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('service')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeSubTab === 'service'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Service & Repairs ({vehicleServiceLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeSubTab === 'reminders'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Service Reminders ({vehicleReminders.filter(r => !r.isCompleted).length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeSubTab === 'analytics'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Cost & Mileage Trend</span>
        </button>
      </div>

      {/* SubTab 1: FUEL LOGS */}
      {activeSubTab === 'fuel' && (
        <div className="space-y-3">
          {vehicleFuelLogs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
              <Fuel className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No fuel fill-ups yet</h4>
              <p className="text-xs text-slate-500 mt-1">
                Log your octane fill-ups to auto-calculate your bike's real km/l efficiency.
              </p>
            </div>
          ) : (
            vehicleFuelLogs.map((log) => {
              const comp = computedFuelLogs.get(log.id);
              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                      <Droplet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 font-mono">
                          {log.odometer.toLocaleString()} km
                        </span>
                        {log.isFullTank && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Full Tank
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{formatDateDDMMMYY(log.date)}</span>
                        <span>•</span>
                        <span>{log.liters} L @ {formatTaka(log.pricePerLiter)}/L</span>
                        {log.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-300 truncate max-w-xs">{log.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Calculations Pill */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      {comp?.kmpl ? (
                        <div className="text-sm font-extrabold text-cyan-300 font-mono">
                          {comp.kmpl.toFixed(1)} km/l
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">First log / partial</div>
                      )}
                      {comp?.distance ? (
                        <div className="text-[10px] text-slate-400">
                          +{comp.distance} km since last fill
                        </div>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-100 font-mono">
                        {formatTaka(log.totalCost)}
                      </div>
                      {comp?.costPerKm && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatTaka(comp.costPerKm, true)}/km
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setDeletingFuelId(log.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SubTab 2: SERVICE & REPAIRS */}
      {activeSubTab === 'service' && (
        <div className="space-y-3">
          {vehicleServiceLogs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
              <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No service records</h4>
              <p className="text-xs text-slate-500 mt-1">
                Track engine oil changes, brake pads, chain maintenance, insurance, and tax tokens.
              </p>
            </div>
          ) : (
            vehicleServiceLogs.map((svc) => (
              <div
                key={svc.id}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">{svc.serviceType}</span>
                      <span className="text-xs font-mono text-slate-400">@ {svc.odometer.toLocaleString()} km</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{formatDateDDMMMYY(svc.date)}</span>
                      {svc.workshop && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300">{svc.workshop}</span>
                        </>
                      )}
                      {svc.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-400">{svc.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-300 font-mono">
                      {formatTaka(svc.cost)}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeletingServiceId(svc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SubTab 3: SERVICE REMINDERS */}
      {activeSubTab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Set reminders by odometer distance (e.g. oil change every 2,000 km) or calendar date.
            </p>
            <button
              onClick={() => {
                if (currentVehicle) setRemTargetOdo((currentVehicle.currentOdo + 2000).toString());
                setIsReminderModalOpen(true);
              }}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              + Add Reminder
            </button>
          </div>

          <div className="space-y-2.5">
            {vehicleReminders.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-500">
                No active reminders set for this vehicle.
              </div>
            ) : (
              vehicleReminders.map(rem => {
                const currentOdo = currentVehicle?.currentOdo || 0;
                const kmLeft = rem.targetOdometer ? rem.targetOdometer - currentOdo : null;
                const isOdoOverdue = kmLeft !== null && kmLeft <= 0;
                const isOdoDueSoon = kmLeft !== null && kmLeft > 0 && kmLeft <= 250;

                const daysLeft = rem.targetDate ? getDaysDifference(rem.targetDate, todayStr) : null;
                const isDateOverdue = daysLeft !== null && daysLeft <= 0;
                const isDateDueSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 15;

                const isOverdue = !rem.isCompleted && (isOdoOverdue || isDateOverdue);
                const isDueSoon = !rem.isCompleted && !isOverdue && (isOdoDueSoon || isDateDueSoon);

                return (
                  <div
                    key={rem.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                      rem.isCompleted
                        ? 'bg-slate-900/40 border-slate-800/50 opacity-60'
                        : isOverdue
                        ? 'bg-red-500/10 border-red-500/30'
                        : isDueSoon
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleBikeReminder(rem.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition ${
                          rem.isCompleted
                            ? 'bg-teal-500 text-slate-950 font-bold'
                            : 'border border-slate-600 hover:border-teal-400'
                        }`}
                      >
                        {rem.isCompleted && '✓'}
                      </button>

                      <div>
                        <div className={`text-xs sm:text-sm font-semibold ${rem.isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          {rem.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                          {rem.targetOdometer && (
                            <span>Target: {rem.targetOdometer.toLocaleString()} km</span>
                          )}
                          {rem.targetDate && (
                            <span>Target: {formatDateDDMMMYY(rem.targetDate)}</span>
                          )}
                          {rem.notes && <span className="italic text-slate-300">{rem.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {!rem.isCompleted && (
                        <div>
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                              Overdue!
                            </span>
                          )}
                          {isDueSoon && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Due Soon ({kmLeft !== null ? `${kmLeft} km left` : `${daysLeft} days left`})
                            </span>
                          )}
                          {!isOverdue && !isDueSoon && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {kmLeft !== null ? `${kmLeft} km remaining` : `${daysLeft} days remaining`}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => setDeletingReminderId(rem.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SubTab 4: ANALYTICS & TRENDS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 mb-2">Cost Breakdown</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Fuel
                  </span>
                  <span className="font-mono font-bold text-slate-200">{formatTaka(totalFuelCost)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Service & Repairs
                  </span>
                  <span className="font-mono font-bold text-slate-200">{formatTaka(totalServiceCost)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Total Running Cost</span>
                  <span className="font-mono text-teal-300">{formatTaka(totalBikeCost)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 mb-2">Vehicle Specs & Health</h4>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Odometer:</span>
                  <span className="font-mono font-bold">{currentVehicle?.currentOdo.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registration:</span>
                  <span className="font-mono">{currentVehicle?.regNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calculated Average:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {avgKmpl ? `${avgKmpl.toFixed(1)} km/liter` : 'Needs 2+ full tank logs'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Log Modal */}
      <Modal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        title="Record Fuel Fill-up"
        subtitle={`Vehicle: ${currentVehicle?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveFuelLog} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                required
                value={fuelDate}
                onChange={(e) => setFuelDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Odometer (km) *</label>
              <input
                type="number"
                required
                value={fuelOdometer}
                onChange={(e) => setFuelOdometer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Liters *</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 10.5"
                value={fuelLiters}
                onChange={(e) => handleFuelLitersChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Price / L (৳)</label>
              <input
                type="number"
                step="any"
                value={fuelPricePerLiter}
                onChange={(e) => handleFuelPriceChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Total Cost (৳) *</label>
              <input
                type="number"
                required
                value={fuelTotalCost}
                onChange={(e) => setFuelTotalCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Full Tank Fill-up</div>
              <p className="text-[11px] text-slate-400">Required for accurate km/l calculation</p>
            </div>
            <input
              type="checkbox"
              checked={fuelIsFullTank}
              onChange={(e) => setFuelIsFullTank(e.target.checked)}
              className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes (Station, Brand)</label>
            <input
              type="text"
              value={fuelNotes}
              onChange={(e) => setFuelNotes(e.target.value)}
              placeholder="e.g. Meghna Petrol Pump Tejgaon, Octane 95"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsFuelModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Save Fill-up
            </button>
          </div>
        </form>
      </Modal>

      {/* Service Modal */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Record Service / Maintenance"
        subtitle={`Vehicle: ${currentVehicle?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveServiceLog} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Type *</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              >
                <option value="Engine Oil">Engine Oil</option>
                <option value="Oil Filter">Oil Filter</option>
                <option value="Chain Lube & Tighten">Chain Lube & Tighten</option>
                <option value="Brake Pads Front/Rear">Brake Pads Front/Rear</option>
                <option value="Tyre Replacement">Tyre Replacement</option>
                <option value="Spark Plug">Spark Plug</option>
                <option value="Periodic Full Service">Periodic Full Service</option>
                <option value="Tax Token & Fitness">Tax Token & Fitness</option>
                <option value="Insurance Renewal">Insurance Renewal</option>
                <option value="Toll & Parking">Toll & Parking</option>
                <option value="Repair / Accident">Repair / Accident</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cost (৳) *</label>
              <input
                type="number"
                required
                placeholder="0"
                value={serviceCost}
                onChange={(e) => setServiceCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Odometer (km) *</label>
              <input
                type="number"
                required
                value={serviceOdometer}
                onChange={(e) => setServiceOdometer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Workshop / Mechanic</label>
            <input
              type="text"
              value={serviceWorkshop}
              onChange={(e) => setServiceWorkshop(e.target.value)}
              placeholder="e.g. Yamaha Official Service Center"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Parts Replaced</label>
            <input
              type="text"
              value={serviceNotes}
              onChange={(e) => setServiceNotes(e.target.value)}
              placeholder="e.g. Yamalube Full Synthetic 10W40, cleaned air filter"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Save Service Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Reminder Modal */}
      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="New Service Reminder"
        subtitle={`Vehicle: ${currentVehicle?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveReminder} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Reminder Title *</label>
            <input
              type="text"
              required
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              placeholder="e.g. Engine Oil Change (Every 2,000 km)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Trigger Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['odometer', 'date', 'both'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRemType(t)}
                  className={`py-1.5 text-xs font-semibold rounded-lg capitalize ${
                    remType === t ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {(remType === 'odometer' || remType === 'both') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Odometer (km) *
              </label>
              <input
                type="number"
                value={remTargetOdo}
                onChange={(e) => setRemTargetOdo(e.target.value)}
                placeholder="e.g. 10400"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
          )}

          {(remType === 'date' || remType === 'both') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Date *
              </label>
              <input
                type="date"
                value={remTargetDate}
                onChange={(e) => setRemTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
            <input
              type="text"
              value={remNotes}
              onChange={(e) => setRemNotes(e.target.value)}
              placeholder="e.g. Buy Mobil 1 Racing 4T 10W-40"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Set Reminder
            </button>
          </div>
        </form>
      </Modal>

      {/* New Vehicle Modal */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        title="Add Vehicle"
        subtitle="Manage bike or scooter"
        maxWidth="md"
      >
        <form onSubmit={handleSaveVehicle} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Vehicle Name *</label>
            <input
              type="text"
              required
              value={vehName}
              onChange={(e) => setVehName(e.target.value)}
              placeholder="e.g. Yamaha FZ-S Fi V3"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Model / Engine</label>
              <input
                type="text"
                value={vehModel}
                onChange={(e) => setVehModel(e.target.value)}
                placeholder="e.g. 150cc BS6"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Registration No</label>
              <input
                type="text"
                value={vehRegNumber}
                onChange={(e) => setVehRegNumber(e.target.value)}
                placeholder="Dhaka Metro-LA 12-3456"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Current Odometer (km)</label>
            <input
              type="number"
              value={vehCurrentOdo}
              onChange={(e) => setVehCurrentOdo(e.target.value)}
              placeholder="e.g. 8500"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsVehicleModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Add Vehicle
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modals */}
      <ConfirmModal
        isOpen={!!deletingFuelId}
        onClose={() => setDeletingFuelId(null)}
        onConfirm={() => {
          if (deletingFuelId) deleteFuelLog(deletingFuelId);
        }}
        title="Delete Fuel Log"
        message="Are you sure you want to delete this fill-up entry?"
      />

      <ConfirmModal
        isOpen={!!deletingServiceId}
        onClose={() => setDeletingServiceId(null)}
        onConfirm={() => {
          if (deletingServiceId) deleteServiceLog(deletingServiceId);
        }}
        title="Delete Service Log"
        message="Are you sure you want to delete this service record?"
      />

      <ConfirmModal
        isOpen={!!deletingReminderId}
        onClose={() => setDeletingReminderId(null)}
        onConfirm={() => {
          if (deletingReminderId) deleteBikeReminder(deletingReminderId);
        }}
        title="Delete Reminder"
        message="Are you sure you want to remove this service reminder?"
      />
    </div>
  );
};
