'use server';

import type { AnalyticsChartInput } from './types';
import {
  createAnalyticsChart,
  deleteAnalyticsChart,
  getAnalyticsChartsByOrgId,
  updateAnalyticsChart,
} from './analytics-dal';

export async function getAnalyticsChartsAction(orgId: string) {
  try {
    return await getAnalyticsChartsByOrgId(orgId);
  } catch (error) {
    console.error('Error loading analytics charts:', error);
    throw error;
  }
}

export async function createAnalyticsChartAction(
  orgId: string,
  input: AnalyticsChartInput
) {
  try {
    return await createAnalyticsChart(orgId, input);
  } catch (error) {
    console.error('Error creating analytics chart:', error);
    throw error;
  }
}

export async function updateAnalyticsChartAction(
  chartId: string,
  input: AnalyticsChartInput
) {
  try {
    return await updateAnalyticsChart(chartId, input);
  } catch (error) {
    console.error('Error updating analytics chart:', error);
    throw error;
  }
}

export async function deleteAnalyticsChartAction(chartId: string) {
  try {
    await deleteAnalyticsChart(chartId);
  } catch (error) {
    console.error('Error deleting analytics chart:', error);
    throw error;
  }
}
