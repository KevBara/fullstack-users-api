'use client';

import { FormEvent, useEffect, useState } from 'react';

import { User } from '@/lib/api';

export type UserFormValues = {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  active: boolean;
};

interface UserFormProps {
  initialValues?: Partial<User>;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const defaultValues: UserFormValues = {
  name: '',
  email: '',
  role: 'user',
  active: true,
};

export function UserForm({ initialValues, submitLabel, onSubmit, onCancel }: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>({ ...defaultValues, ...initialValues });

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues });
  }, [initialValues]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <div className="field-group">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Nombre completo"
          required
        />
      </div>

      <div className="field-group">
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="field-group">
        <label htmlFor="role">Rol</label>
        <select
          id="role"
          value={values.role}
          onChange={(event) => setValues((current) => ({ ...current, role: event.target.value as UserFormValues['role'] }))}
        >
          <option value="user">Usuario</option>
          <option value="admin">Administrador</option>
          <option value="manager">Responsable</option>
        </select>
      </div>

      <label className="checkbox-row" htmlFor="active">
        <input
          id="active"
          type="checkbox"
          checked={values.active}
          onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))}
        />
        Usuario activo
      </label>

      <div className="form-actions">
        <button type="submit" className="primary-button">{submitLabel}</button>
        {onCancel ? (
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
