import { useState, useEffect } from 'react';
import { LobbySettings } from '../../types/lobby';
import styles from './LobbySettingsModal.module.css';

interface LobbySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: LobbySettings;
  onSaveSettings: (settings: LobbySettings) => void;
}

export function LobbySettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings
}: LobbySettingsModalProps) {
  const [settings, setSettings] = useState<LobbySettings>(currentSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
    }
  }, [isOpen, currentSettings]);

  const handleSave = () => {
    onSaveSettings(settings);
    onClose();
  };

  const handleCancel = () => {
    setSettings(currentSettings);
    onClose();
  };

  const getGameModeName = (mode: string) => {
    const modes: { [key: string]: string } = {
      'standard': 'Стандартный',
      'extended': 'Расширенный',
      'competitive': 'Соревновательный',
      'cooperative': 'Кооперативный'
    };
    return modes[mode] || mode;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Настройки лобби</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'basic' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Основные
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'advanced' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Дополнительно
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'basic' && (
            <div className={styles.settingGroup}>
              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>
                  Максимум игроков
                </label>
                <select 
                  value={settings.maxPlayers}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                  className={styles.select}
                >
                  <option value={2}>2 игрока</option>
                  <option value={3}>3 игрока</option>
                  <option value={4}>4 игрока</option>
                  <option value={5}>5 игроков</option>
                  <option value={6}>6 игроков</option>
                </select>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>
                  Режим игры
                </label>
                <select 
                  value={settings.gameMode}
                  onChange={(e) => setSettings(prev => ({ ...prev, gameMode: e.target.value }))}
                  className={styles.select}
                >
                  <option value="standard">Стандартный</option>
                  <option value="extended">Расширенный</option>
                  <option value="competitive">Соревновательный</option>
                  <option value="cooperative">Кооперативный</option>
                </select>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.isPrivate}
                    onChange={(e) => setSettings(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    className={styles.checkbox}
                  />
                  Приватное лобби
                </label>
              </div>

              {settings.isPrivate && (
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    Пароль доступа
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.password}
                    onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
                    className={styles.passwordInput}
                    placeholder="Введите пароль..."
                  />
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className={styles.checkbox}
                    />
                    Показать пароль
                  </label>
                </div>
              )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className={styles.settingGroup}>
              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>
                  Сложность
                </label>
                <select 
                  value={settings.difficulty || 'auto'}
                  onChange={(e) => setSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                  className={styles.select}
                >
                  <option value="auto">Автоматическая</option>
                  <option value="easy">Лёгкая</option>
                  <option value="medium">Средняя</option>
                  <option value="hard">Сложная</option>
                </select>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>
                  Время на ход
                </label>
                <select 
                  value={settings.turnTime || 'unlimited'}
                  onChange={(e) => setSettings(prev => ({ ...prev, turnTime: e.target.value }))}
                  className={styles.select}
                >
                  <option value="unlimited">Неограниченно</option>
                  <option value="60">1 минута</option>
                  <option value="180">3 минуты</option>
                  <option value="300">5 минут</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className={styles.preview}>
          <h3 className={styles.previewTitle}>Предпросмотр настроек</h3>
          <div className={styles.previewContent}>
            <div className={styles.previewItem}>
              <span>Игроков:</span>
              <span>{settings.maxPlayers}</span>
            </div>
            <div className={styles.previewItem}>
              <span>Режим:</span>
              <span>{getGameModeName(settings.gameMode)}</span>
            </div>
            <div className={styles.previewItem}>
              <span>Доступ:</span>
              <span className={settings.isPrivate ? styles.private : styles.public}>
                {settings.isPrivate ? '🔒 Приватное' : '🔓 Публичное'}
                {settings.isPrivate && settings.password && ' (с паролем)'}
              </span>
            </div>
            {settings.difficulty && settings.difficulty !== 'auto' && (
              <div className={styles.previewItem}>
                <span>Сложность:</span>
                <span>
                  {settings.difficulty === 'easy' && 'Лёгкая'}
                  {settings.difficulty === 'medium' && 'Средняя'}
                  {settings.difficulty === 'hard' && 'Сложная'}
                </span>
              </div>
            )}
            {settings.turnTime && settings.turnTime !== 'unlimited' && (
              <div className={styles.previewItem}>
                <span>Время на ход:</span>
                <span>
                  {settings.turnTime === '60' && '1 минута'}
                  {settings.turnTime === '180' && '3 минуты'}
                  {settings.turnTime === '300' && '5 минут'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            Отмена
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}

export type { LobbySettings };