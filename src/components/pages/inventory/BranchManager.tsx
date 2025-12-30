import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { DB, Branch } from '../../../types/models';
import { uid, nowIso } from '../../../lib/utils';

interface BranchManagerProps {
  db: DB;
  // eslint-disable-next-line no-unused-vars
  onSave: (branches: Branch[]) => void;
  onClose: () => void;
}

export function BranchManager({ db, onSave, onClose }: BranchManagerProps) {
  const { t } = useTranslation();
  const [newBranchName, setNewBranchName] = useState('');
  const [branches, setBranches] = useState<Branch[]>(db.branches || []);

  const activeBranches = branches.filter(b => !b.closedAt);
  const closedBranches = branches.filter(b => b.closedAt);

  const handleCreateBranch = () => {
    const trimmedName = newBranchName.trim();
    if (!trimmedName) {
      alert(t('inventory.branches.pleaseEnterName'));
      return;
    }

    // Check for duplicate names (case-insensitive)
    const nameExists = branches.some(
      b => b.name.toLowerCase() === trimmedName.toLowerCase() && !b.closedAt
    );
    if (nameExists) {
      alert(t('inventory.branches.nameAlreadyExists'));
      return;
    }

    const newBranch: Branch = {
      id: uid(),
      name: trimmedName,
      createdAt: nowIso(),
    };

    setBranches([...branches, newBranch]);
    setNewBranchName('');
  };

  const handleCloseBranch = (branchId: string) => {
    if (!window.confirm(t('inventory.branches.confirmCloseBranch'))) {
      return;
    }

    const updatedBranches = branches.map(b =>
      b.id === branchId ? { ...b, closedAt: nowIso() } : b
    );
    setBranches(updatedBranches);
  };

  const handleReopenBranch = (branchId: string) => {
    const updatedBranches = branches.map(b =>
      b.id === branchId ? { ...b, closedAt: undefined } : b
    );
    setBranches(updatedBranches);
  };

  const handleDeleteBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    // Check if branch has any inventory items
    const hasItems = db.items.some(item => item.branchId === branchId);
    if (hasItems) {
      alert(t('inventory.branches.cannotDeleteWithItems'));
      return;
    }

    if (!window.confirm(t('inventory.branches.confirmDeleteBranch', { name: branch.name }))) {
      return;
    }

    setBranches(branches.filter(b => b.id !== branchId));
  };

  const handleSave = () => {
    onSave(branches);
    onClose();
  };

  return (
    <Modal title={t('inventory.branches.manageTitle')} onClose={onClose}>
      <div className="section-title">{t('inventory.branches.createNew')}</div>
      <div className="grid two row-gap">
        <div>
          <label>{t('inventory.branches.branchName')}</label>
          <input
            type="text"
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateBranch();
              }
            }}
            placeholder={t('inventory.branches.enterBranchName')}
          />
        </div>
        <div className="flex align-center">
          <Button onClick={handleCreateBranch} variant="primary">
            {t('inventory.branches.createBranch')}
          </Button>
        </div>
      </div>

      {activeBranches.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: '2rem' }}>
            {t('inventory.branches.activeBranches')}
          </div>
          <div className="cards">
            {activeBranches.map(branch => (
              <div key={branch.id} className="card">
                <div className="flex space-between align-center">
                  <div>
                    <h4>{branch.name}</h4>
                    <p className="text-muted">
                      {t('inventory.branches.created')}:{' '}
                      {new Date(branch.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap">
                    <Button
                      variant="secondary"
                      onClick={() => handleCloseBranch(branch.id)}
                      title={t('inventory.branches.closeBranchTitle')}
                    >
                      {t('inventory.branches.close')}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteBranch(branch.id)}
                      title={t('inventory.branches.deleteBranchTitle')}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {closedBranches.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: '2rem' }}>
            {t('inventory.branches.closedBranches')}
          </div>
          <div className="cards">
            {closedBranches.map(branch => (
              <div key={branch.id} className="card">
                <div className="flex space-between align-center">
                  <div>
                    <h4>{branch.name}</h4>
                    <p className="text-muted">
                      {t('inventory.branches.closed')}:{' '}
                      {branch.closedAt ? new Date(branch.closedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="flex gap">
                    <Button
                      variant="secondary"
                      onClick={() => handleReopenBranch(branch.id)}
                      title={t('inventory.branches.reopenBranchTitle')}
                    >
                      {t('inventory.branches.reopen')}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteBranch(branch.id)}
                      title={t('inventory.branches.deleteBranchTitle')}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {branches.length === 0 && (
        <div className="empty">
          <p>{t('inventory.branches.noBranches')}</p>
        </div>
      )}

      <div className="row gap end" style={{ marginTop: '2rem' }}>
        <Button variant="primary" onClick={handleSave}>
          {t('inventory.saveChanges')}
        </Button>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </Modal>
  );
}
