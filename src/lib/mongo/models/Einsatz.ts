import { Einsatz, EinsatzStatus, EinsatzSystemStatus, EinsatzFilter } from '@/features/einsatz/types/einsatz';
import clientPromise from '@/lib/mongo/client';

export class EinsatzModel {
  private static readonly COLLECTION_NAME = 'einsaetze';

  static async getCollection() {
    const client = await clientPromise;
    return client.db().collection(this.COLLECTION_NAME);
  }

  static async createIndexes() {
    const collection = await this.getCollection();
    
    // Indexes für bessere Performance
    await collection.createIndex({ datum: 1 });
    await collection.createIndex({ kategorie: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ systemStatus: 1 });
    await collection.createIndex({ createdBy: 1 });
  }

  static validateEinsatz(einsatz: Partial<Einsatz>): string[] {
    const errors: string[] = [];

    if (!einsatz.name || einsatz.name.trim().length === 0) {
      errors.push('Name ist erforderlich');
    }
    if (!einsatz.kategorie || einsatz.kategorie.trim().length === 0) {
      errors.push('Kategorie ist erforderlich');
    }
    if (!einsatz.datum) {
      errors.push('Datum ist erforderlich');
    }
    if (!einsatz.uhrzeitVon || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(einsatz.uhrzeitVon)) {
      errors.push('Gültige Startzeit ist erforderlich');
    }
    if (!einsatz.uhrzeitBis || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(einsatz.uhrzeitBis)) {
      errors.push('Gültige Endzeit ist erforderlich');
    }
    if (einsatz.anzahlTeilnehmer === undefined || einsatz.anzahlTeilnehmer < 0) {
      errors.push('Anzahl Teilnehmer muss größer oder gleich 0 sein');
    }
    if (einsatz.einzelpreis === undefined || einsatz.einzelpreis < 0) {
      errors.push('Einzelpreis muss größer oder gleich 0 sein');
    }
    if (einsatz.anzahlHelfer === undefined || einsatz.anzahlHelfer < 0) {
      errors.push('Anzahl Helfer muss größer oder gleich 0 sein');
    }

    return errors;
  }

  static calculateStatus(einsatz: Einsatz): EinsatzStatus {
    const isComplete = einsatz.name && 
                      einsatz.kategorie && 
                      einsatz.datum && 
                      einsatz.uhrzeitVon && 
                      einsatz.uhrzeitBis && 
                      einsatz.anzahlTeilnehmer >= 0 && 
                      einsatz.einzelpreis >= 0 && 
                      einsatz.anzahlHelfer > 0;

    if (!isComplete) {
      return EinsatzStatus.UNVOLLSTAENDIG;
    }

    if (einsatz.helfer && einsatz.helfer.length >= einsatz.anzahlHelfer) {
      return EinsatzStatus.VERGEBEN;
    }

    return EinsatzStatus.OFFEN;
  }

  static async create(einsatzData: Omit<Einsatz, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await this.getCollection();
    const now = new Date();
    
    const einsatz = {
      ...einsatzData,
      createdAt: now,
      updatedAt: now,
      status: this.calculateStatus(einsatzData as Einsatz),
      systemStatus: einsatzData.systemStatus || EinsatzSystemStatus.ENTWURF
    };

    const result = await collection.insertOne(einsatz);
    return { ...einsatz, _id: result.insertedId.toString() };
  }

  static async findById(id: string) {
    const collection = await this.getCollection();
    const { ObjectId } = await import('mongodb');
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findAll(filter?: EinsatzFilter, limit?: number, skip?: number) {
    const collection = await this.getCollection();
    const query: any = {};

    if (filter) {
      if (filter.name) {
        query.name = { $regex: filter.name, $options: 'i' };
      }
      if (filter.kategorie) {
        query.kategorie = filter.kategorie;
      }
      if (filter.status) {
        query.status = filter.status;
      }
      if (filter.systemStatus) {
        query.systemStatus = filter.systemStatus;
      }
      if (filter.datum) {
        query.datum = {};
        if (filter.datum.from) {
          query.datum.$gte = filter.datum.from;
        }
        if (filter.datum.to) {
          query.datum.$lte = filter.datum.to;
        }
      }
    }

    let cursor = collection.find(query);
    
    if (skip) cursor = cursor.skip(skip);
    if (limit) cursor = cursor.limit(limit);

    const results = await cursor.toArray();
    return results.map(item => ({
      ...item,
      _id: item._id.toString()
    }));
  }

  static async update(id: string, updateData: Partial<Einsatz>) {
    const collection = await this.getCollection();
    const { ObjectId } = await import('mongodb');
    const now = new Date();
    
    const updateDoc = {
      ...updateData,
      updatedAt: now
    };

    // Recalculate status if relevant fields changed
    if (updateData.name || updateData.kategorie || updateData.datum || 
        updateData.uhrzeitVon || updateData.uhrzeitBis || updateData.anzahlTeilnehmer ||
        updateData.einzelpreis || updateData.anzahlHelfer || updateData.helfer) {
      
      const existing = await this.findById(id);
      if (existing) {
        const merged = { ...existing, ...updateDoc, _id: existing._id?.toString() };
        updateDoc.status = this.calculateStatus(merged as Einsatz);
      }
    }

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

  static async count(filter?: EinsatzFilter) {
    const collection = await this.getCollection();
    const query: any = {};

    if (filter) {
      if (filter.name) {
        query.name = { $regex: filter.name, $options: 'i' };
      }
      if (filter.kategorie) {
        query.kategorie = filter.kategorie;
      }
      if (filter.status) {
        query.status = filter.status;
      }
      if (filter.systemStatus) {
        query.systemStatus = filter.systemStatus;
      }
    }

    return await collection.countDocuments(query);
  }
}
