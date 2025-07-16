import { CustomFieldDefinition, CustomFieldType } from '@/features/einsatz/types/einsatz';
import clientPromise from '@/lib/mongo/client';

export class CustomFieldDefinitionModel {
  private static readonly COLLECTION_NAME = 'custom_field_definitions';

  static async getCollection() {
    const client = await clientPromise;
    return client.db().collection(this.COLLECTION_NAME);
  }

  static async createIndexes() {
    const collection = await this.getCollection();
    
    // Indexes für bessere Performance
    await collection.createIndex({ name: 1 });
    await collection.createIndex({ type: 1 });
    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ order: 1 });
  }

  static validateCustomFieldDefinition(field: Partial<CustomFieldDefinition>): string[] {
    const errors: string[] = [];

    if (!field.name || field.name.trim().length === 0) {
      errors.push('Name ist erforderlich');
    }
    if (!field.type || !Object.values(CustomFieldType).includes(field.type)) {
      errors.push('Gültiger Typ ist erforderlich');
    }
    if (field.type === CustomFieldType.DROPDOWN && (!field.options || field.options.length === 0)) {
      errors.push('Dropdown-Felder benötigen mindestens eine Option');
    }
    if (field.order === undefined || field.order < 0) {
      errors.push('Reihenfolge muss größer oder gleich 0 sein');
    }

    return errors;
  }

  static async create(fieldData: Omit<CustomFieldDefinition, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await this.getCollection();
    const now = new Date();
    
    const field = {
      ...fieldData,
      createdAt: now,
      updatedAt: now,
      isActive: fieldData.isActive !== undefined ? fieldData.isActive : true
    };

    const result = await collection.insertOne(field);
    return { ...field, _id: result.insertedId.toString() };
  }

  static async findById(id: string) {
    const collection = await this.getCollection();
    const { ObjectId } = await import('mongodb');
    const result = await collection.findOne({ _id: new ObjectId(id) });
    return result ? { ...result, _id: result._id.toString() } : null;
  }

  static async findAll(activeOnly: boolean = true) {
    const collection = await this.getCollection();
    const query: any = {};
    
    if (activeOnly) {
      query.isActive = true;
    }

    const results = await collection.find(query).sort({ order: 1 }).toArray();
    return results.map(item => ({
      ...item,
      _id: item._id.toString()
    }));
  }

  static async update(id: string, updateData: Partial<CustomFieldDefinition>) {
    const collection = await this.getCollection();
    const { ObjectId } = await import('mongodb');
    const now = new Date();
    
    const updateDoc = {
      ...updateData,
      updatedAt: now
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    return result.modifiedCount > 0;
  }

  static async delete(id: string) {
    const collection = await this.getCollection();
    const { ObjectId } = await import('mongodb');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  static async reorder(fieldIds: string[]) {
    const collection = await this.getCollection();
    const { ObjectId } = await import('mongodb');
    const operations = fieldIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { order: index, updatedAt: new Date() } }
      }
    }));

    const result = await collection.bulkWrite(operations);
    return result.modifiedCount > 0;
  }

  static async getDefaultFields(): Promise<Omit<CustomFieldDefinition, '_id'>[]> {
    return [
      {
        name: 'Gruppe',
        type: CustomFieldType.DROPDOWN,
        required: false,
        options: ['Kinder', 'Jugendliche', 'Erwachsene', 'Senioren'],
        order: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Schulstufe',
        type: CustomFieldType.TEXT,
        required: false,
        order: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Anreise',
        type: CustomFieldType.DROPDOWN,
        required: false,
        options: ['Eigenanreise', 'Bus', 'Bahn', 'Flugzeug'],
        order: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Fördergemeinschaft',
        type: CustomFieldType.TOGGLE,
        required: false,
        defaultValue: false,
        order: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Anmerkung',
        type: CustomFieldType.TEXTAREA,
        required: false,
        order: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  static async initializeDefaultFields() {
    const collection = await this.getCollection();
    const count = await collection.countDocuments();
    
    if (count === 0) {
      const defaultFields = await this.getDefaultFields();
      await collection.insertMany(defaultFields);
    }
  }
}
