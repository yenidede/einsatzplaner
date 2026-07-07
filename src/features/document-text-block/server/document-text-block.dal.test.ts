import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = {
    $executeRaw: vi.fn(),
    pdfTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    transaction,
    runTransaction: vi.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
    ),
  };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mocks.runTransaction,
  },
}));

import { initializeDocumentTextBlockRecords } from './document-text-block.dal';

const contentJson = {
  kind: 'DOCUMENT_TEXT_BLOCK_V1',
  version: 1,
  description: '',
  category: '',
  plainText: 'Inhalt',
  document: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inhalt' }] }],
  },
};

describe('Textbaustein-Initialisierung', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.pdfTemplate.findFirst.mockResolvedValue(null);
    mocks.transaction.pdfTemplate.findMany.mockResolvedValue([]);
    mocks.transaction.pdfTemplate.create.mockResolvedValue({});
  });

  it('legt nur fehlende Startbausteine an und schreibt einen Marker', async () => {
    mocks.transaction.pdfTemplate.findMany.mockResolvedValue([
      { name: 'Kontaktblock', contentJson },
    ]);

    await initializeDocumentTextBlockRecords('organization-1', [
      { seedKey: 'contact-block', name: 'Kontaktblock', contentJson },
      { seedKey: 'price-block', name: 'Preisblock', contentJson },
    ]);

    expect(mocks.transaction.$executeRaw).toHaveBeenCalledOnce();
    expect(mocks.transaction.pdfTemplate.create).toHaveBeenCalledTimes(2);
    expect(mocks.transaction.pdfTemplate.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Preisblock' }),
      })
    );
    expect(mocks.transaction.pdfTemplate.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          documentType: 'DOCUMENT_TEXT_BLOCK_SEED_MARKER_V1',
          isActive: false,
        }),
      })
    );
  });

  it('stellt gelöschte Startbausteine nach gesetztem Marker nicht wieder her', async () => {
    mocks.transaction.pdfTemplate.findFirst.mockResolvedValue({
      id: 'seed-marker',
    });

    await initializeDocumentTextBlockRecords('organization-1', [
      { seedKey: 'contact-block', name: 'Kontaktblock', contentJson },
    ]);

    expect(mocks.transaction.pdfTemplate.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction.pdfTemplate.create).not.toHaveBeenCalled();
  });
});
