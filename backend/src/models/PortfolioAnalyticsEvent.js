import mongoose from 'mongoose';
import { eventTypes, sources } from '../utils/portfolioAnalytics.js';
const schema = new mongoose.Schema({
  _id: String,
  owner: { type: mongoose.Schema.Types.ObjectId, required: true },
  visitor: String,
  measurement: { type: String, enum: ['activity', 'browser'] },
  version: Number,
  type: { type: String, enum: eventTypes, required: true },
  source: { type: String, enum: sources },
  channel: { type: String, enum: ['employer-application', 'saved-candidates'] },
  cvVersion: String,
  activationId: String,
  projectKey: String,
  at: { type: Date, required: true },
}, { autoIndex: false, autoCreate: false, versionKey: false });
schema.index({ owner: 1, at: 1 }, { name: 'portfolio_analytics_owner_time' });
schema.index({ at: 1 }, { expireAfterSeconds: 90 * 86400, name: 'portfolio_analytics_retention' });
const Event = mongoose.model('PortfolioAnalyticsEvent', schema);
export async function assertAnalyticsReady() {
  const indexes = await Event.collection.listIndexes().toArray();
  if (!indexes.some(i => i.name === 'portfolio_analytics_owner_time' && JSON.stringify(i.key) === JSON.stringify({ owner: 1, at: 1 }) && !i.partialFilterExpression)
    || !indexes.some(i => JSON.stringify(i.key) === JSON.stringify({ at: 1 }) && !i.partialFilterExpression && i.expireAfterSeconds === 90 * 86400)) throw Error('Analytics indexes unavailable');
}
export default Event;
