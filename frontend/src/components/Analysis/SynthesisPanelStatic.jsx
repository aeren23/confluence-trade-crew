/**
 * SynthesisPanelStatic — renders SynthesisPanel from injected data without
 * touching the Zustand store. Used by AnalysisDetailPage for deep-link views.
 */
import React from 'react';
import SynthesisPanel from './SynthesisPanel';

const SynthesisPanelStatic = ({ analysisData }) => {
  return <SynthesisPanel injectData={analysisData} />;
};

export default SynthesisPanelStatic;
