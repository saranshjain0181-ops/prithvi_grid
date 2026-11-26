import mongoose, { Document, Schema } from 'mongoose';

export interface IFormulaIngredient {
  name: string; // e.g. 'Base Screened Compost', 'Neem Seed Cake', 'Cocopeat', 'Perlite', 'Vermicompost'
  percentageByWeight: number;
  costPerKgInr: number;
}

export interface IManureProductFormula extends Document {
  formulaId: string;
  entityId: string;
  productName: string; // e.g. 'Neem-Shakti Enriched Manure', 'Urban Terrace Potting Mix'
  targetAudience: 'COMMERCIAL_NURSERY' | 'TERRACE_GARDENER' | 'FARMER' | 'LANDSCAPER';
  ingredients: IFormulaIngredient[];
  rawCostPerKgInr: number;
  packagingCostPerBagInr: number;
  bagSizeKg: number;
  recommendedRetailPriceInr: number;
  grossMarginPercentage: number;
  applicationInstructionsHi: string;
  applicationInstructionsEn: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const ManureProductFormulaSchema = new Schema<IManureProductFormula>(
  {
    formulaId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    targetAudience: {
      type: String,
      required: true,
      enum: ['COMMERCIAL_NURSERY', 'TERRACE_GARDENER', 'FARMER', 'LANDSCAPER'],
      index: true,
    },
    ingredients: [
      {
        name: { type: String, required: true },
        percentageByWeight: { type: Number, required: true },
        costPerKgInr: { type: Number, required: true },
      },
    ],
    rawCostPerKgInr: { type: Number, required: true },
    packagingCostPerBagInr: { type: Number, required: true },
    bagSizeKg: { type: Number, required: true },
    recommendedRetailPriceInr: { type: Number, required: true },
    grossMarginPercentage: { type: Number, required: true },
    applicationInstructionsHi: { type: String, required: true },
    applicationInstructionsEn: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

export const ManureProductFormula = mongoose.model<IManureProductFormula>(
  'ManureProductFormula',
  ManureProductFormulaSchema
);
