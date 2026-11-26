import React, { useState } from 'react';
import Step1Entity from './Step1Entity';
import Step2Location from './Step2Location';
import Step3Hardware from './Step3Hardware';
import Step4Network from './Step4Network';
import Step5Personnel from './Step5Personnel';
import type { OnboardingFormData } from '../../types';
import axios from 'axios';

const INITIAL_DATA: OnboardingFormData = {
  clientName: '',
  orgType: 'RWA',
  phone: '',
  email: '',
  swmRegNo: '',
  billingAddress: '',
  imcZone: 'Zone 1',
  imcWard: 'Ward 12',
  facilityName: '',
  coordinates: { lat: 22.7196, lng: 75.8577 },
  noOfBoxes: 1,
  architecture: 'Single',
  boxes: [
    {
      boxNo: 1,
      capacityKg: 1000,
      nodesCount: 1,
      nodes: [{ nodeNo: 1, mac: '', imei: '', simNo: '' }],
    },
  ],
  managerPhone: '',
  otp: '',
  otpSent: false,
  otpVerified: false,
  qrCodes: [],
};

export const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedQrs, setGeneratedQrs] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateField = (field: keyof OnboardingFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('accessToken');

      const payload = {
        orgName: formData.clientName,
        orgType: formData.orgType,
        swmRegNo: formData.swmRegNo,
        phone: formData.phone,
        email: formData.email,
        billingAddress: {
          street: formData.billingAddress,
          city: 'Indore',
          state: 'Madhya Pradesh',
        },
        imcZone: formData.imcZone,
        imcWard: formData.imcWard,
        facilityName: formData.facilityName,
        gpsLat: formData.coordinates?.lat || 22.7196,
        gpsLong: formData.coordinates?.lng || 75.8577,
        boxesCount: formData.boxes.length,
        boxCapacityKg: formData.boxes[0]?.capacityKg || 1000,
        nodesPerBox: formData.boxes[0]?.nodes.length || 1,
        architectureType: formData.architecture === 'Single' ? 'SINGLE' : 'MASTER_SLAVE',
        macAddresses: formData.boxes.flatMap((b) => b.nodes.map((n) => n.mac)),
        imeiNumbers: formData.boxes.flatMap((b) => b.nodes.map((n) => n.imei)),
        simNumbers: formData.boxes.flatMap((b) => b.nodes.map((n) => n.simNo)),
        managerName: (formData as any).managerName || 'Facility Manager',
        managerPhone: formData.managerPhone || formData.phone,
      };

      const res = await axios.post('/api/v1/hq/onboard', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const qrList: any[] = [];
      res.data.data.boxes?.forEach((b: any) => {
        qrList.push({ name: b.name, type: 'COMPOST_BOX', qrUrl: b.qrCodeUrl });
      });
      res.data.data.nodes?.forEach((n: any) => {
        qrList.push({ name: n.name, type: 'IOT_NODE', qrUrl: n.qrCodeUrl });
      });

      setGeneratedQrs(qrList);
      setSuccessMessage('Client successfully onboarded to Prithvi Grid Supreme Lake!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error completing onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-hq-surface rounded-3xl p-8 border border-hq-border shadow-2xl max-w-4xl mx-auto space-y-8">
      {/* Step Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-hq-muted">
          <span>Mega Client Onboarding Wizard</span>
          <span>Step {currentStep} of 5</span>
        </div>
        <div className="w-full bg-hq-border h-2 rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-950/60 border border-green-500 rounded-2xl text-green-300 font-bold text-center text-sm">
          {successMessage}
        </div>
      )}

      {/* Step Render */}
      <div className="min-h-[320px]">
        {currentStep === 1 && <Step1Entity data={formData} onChange={updateField} />}
        {currentStep === 2 && <Step2Location data={formData} onChange={updateField} />}
        {currentStep === 3 && <Step3Hardware data={formData} onChange={updateField} />}
        {currentStep === 4 && <Step4Network data={formData} onChange={updateField} />}
        {currentStep === 5 && (
          <Step5Personnel
            data={formData}
            onChange={updateField}
            generatedQrCodes={generatedQrs}
          />
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-hq-border">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={handlePrev}
          className={`py-3 px-6 rounded-xl font-bold text-sm transition-all ${
            currentStep === 1
              ? 'opacity-40 text-hq-muted cursor-not-allowed'
              : 'bg-hq-border hover:bg-gray-700 text-white'
          }`}
        >
          ← Previous Step
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="py-3 px-8 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black text-sm shadow-lg transition-all"
          >
            Next Step →
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="py-3 px-8 bg-green-500 hover:bg-green-400 text-slate-950 rounded-xl font-black text-sm shadow-xl transition-all"
          >
            {isSubmitting ? 'Onboarding Entity...' : 'Complete Onboarding & Generate QRs ✓'}
          </button>
        )}
      </div>
    </div>
  );
};
export default OnboardingWizard;
