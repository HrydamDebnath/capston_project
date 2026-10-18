import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { Input, Select } from '../../components/common/Field.jsx';
import ClientTable from '../../components/crm/ClientTable.jsx';
import ClientCard from '../../components/crm/ClientCard.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import useEntitlement from '../../hooks/useEntitlement.js';
import { splitList } from '../../utils/format.js';

function AddClientModal({ open, onClose, onCreated }) {
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const submit = async (values) => {
    setServerError('');
    try {
      const { data } = await api.post('/clients', { ...values, tags: splitList(values.tags) });
      reset();
      onCreated(data);
    } catch (error) {
      if (!(error.response && error.response.data && error.response.data.code === 'UPGRADE_REQUIRED')) setServerError(getErrorMessage(error));
      else onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a client" description="They will get an email with a code to sign in to their portal.">
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Input label="Full name" error={errors.name && errors.name.message} {...register('name', { required: 'Enter the client name' })} />
        <Input label="Email" type="email" error={errors.email && errors.email.message} {...register('email', { required: 'Enter an email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        <Input label="Phone" type="tel" {...register('phone')} />
        <Input label="Tags" hint="Separate with commas, for example anxiety, weekly" {...register('tags')} />
        {serverError && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{serverError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Add client</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const toast = useToast();
  const { get } = useEntitlement();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('joined');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort, order, page, q: debounced || undefined, status: status || undefined };
      const { data } = await api.get('/clients', { params });
      setResult(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [sort, order, page, debounced, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const onSort = (field) => {
    if (field === sort) setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(field);
      setOrder(field === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const open = (client) => navigate(`/dashboard/clients/${client._id}`);
  const capacity = get('clients.create');

  return (
    <div>
      <PageHeader
        title="Clients"
        description={capacity && capacity.limit !== null ? `${capacity.used} of ${capacity.limit} active client spots used on your plan.` : 'Everyone you work with, in one place.'}
        actions={<Button onClick={() => setAdding(true)}>Add client</Button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" aria-label="Search clients" className="input max-w-xs" />
          <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} fieldClassName="w-44">
            <option value="">Active and inactive</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
            <option value="all">Everyone</option>
          </Select>
        </div>

        {loading && !result ? (
          <Loader label="Loading clients" />
        ) : result && result.clients.length ? (
          <>
            <div className="hidden md:block"><ClientTable clients={result.clients} sort={sort} order={order} onSort={onSort} onOpen={open} /></div>
            <div className="divide-y divide-line md:hidden">
              {result.clients.map((client, index) => <ClientCard key={client._id} client={client} index={index} onOpen={open} />)}
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
              <span>{result.total} {result.total === 1 ? 'client' : 'clients'}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                <span>Page {result.page} of {result.pages}</span>
                <Button size="sm" variant="outline" disabled={page >= result.pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No clients found" message={debounced || status ? 'Try a different search or filter.' : 'Clients appear here when they book through your link, or you can add one yourself.'} action={<Button onClick={() => setAdding(true)}>Add client</Button>} />
        )}
      </div>

      <AddClientModal open={adding} onClose={() => setAdding(false)} onCreated={(data) => { setAdding(false); setCreated(data); load(); }} />

      <Modal open={Boolean(created)} onClose={() => setCreated(null)} title="Client added" description="Share this code if the email does not arrive.">
        {created && (
          <div>
            <p className="font-semibold">{created.client.name}</p>
            <div className="mt-4 rounded-2xl bg-brand-soft p-4 text-center">
              <p className="text-xs font-semibold text-muted">Portal access code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{created.accessCode}</p>
            </div>
            <div className="mt-5 flex justify-end"><Button onClick={() => setCreated(null)}>Done</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
