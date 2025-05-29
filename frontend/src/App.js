import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
const api = axios.create({
  baseURL: API,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const response = await api.get('/me');
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header user={user} onLogout={logout} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="container mx-auto px-4 py-8">
        {currentView === 'dashboard' && <Dashboard user={user} />}
        {currentView === 'equipment' && <EquipmentManagement user={user} />}
        {currentView === 'tickets' && <TicketManagement user={user} />}
        {currentView === 'maintenance' && <MaintenanceManagement user={user} />}
      </main>
    </div>
  );
}

// Login Screen Component
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await onLogin(username, password);
    if (!success) {
      setError('Credenciais inválidas');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Sistema de Equipamentos Médicos</h2>
          <p className="text-gray-600 mt-2">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Digite seu usuário"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Digite sua senha"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition duration-200 font-medium disabled:opacity-50"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Usuários de teste: <br />
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">admin / admin123</span> (Admin)<br />
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">user / user123</span> (Usuário)
          </p>
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header({ user, onLogout, currentView, setCurrentView }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'equipment', label: 'Equipamentos', icon: '🏥' },
    { id: 'tickets', label: 'Chamados', icon: '🎫' },
    { id: 'maintenance', label: 'Manutenção', icon: '🔧' },
  ];

  return (
    <header className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold text-gray-800">Sistema Médico</h1>
          
          <nav className="hidden md:flex space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-600">Olá, </span>
              <span className="font-medium text-gray-900">{user.username}</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
              }`}>
                {user.role === 'admin' ? 'Admin' : 'Usuário'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              🚪 Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Dashboard Component
function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentEquipment, setRecentEquipment] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (user.role === 'admin') {
        const statsResponse = await api.get('/stats');
        setStats(statsResponse.data);
      }

      const [ticketsResponse, equipmentResponse] = await Promise.all([
        api.get('/tickets'),
        api.get('/equipment')
      ]);

      setRecentTickets(ticketsResponse.data.slice(0, 5));
      setRecentEquipment(equipmentResponse.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        
        {user.role === 'admin' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Equipamentos" value={stats.total_equipment} icon="🏥" color="blue" />
            <StatCard title="Equipamentos Ativos" value={stats.active_equipment} icon="✅" color="green" />
            <StatCard title="Chamados Abertos" value={stats.open_tickets} icon="🎫" color="yellow" />
            <StatCard title="Total Usuários" value={stats.total_users} icon="👥" color="purple" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chamados Recentes</h3>
            {recentTickets.length > 0 ? (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{ticket.title}</h4>
                        <p className="text-sm text-gray-600">{ticket.description.substring(0, 60)}...</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum chamado encontrado</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipamentos Recentes</h3>
            {recentEquipment.length > 0 ? (
              <div className="space-y-3">
                {recentEquipment.map((equipment) => (
                  <div key={equipment.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{equipment.name}</h4>
                        <p className="text-sm text-gray-600">{equipment.manufacturer} - {equipment.model}</p>
                        <p className="text-xs text-gray-500">📍 {equipment.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getEquipmentStatusColor(equipment.status)}`}>
                        {getEquipmentStatusLabel(equipment.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum equipamento encontrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Equipment Management Component
function EquipmentManagement({ user }) {
  const [equipment, setEquipment] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      const response = await api.get('/equipment');
      setEquipment(response.data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  };

  const filteredEquipment = equipment.filter(eq =>
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Equipamentos Médicos</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          ➕ Novo Equipamento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar equipamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((eq) => (
            <EquipmentCard 
              key={eq.id} 
              equipment={eq} 
              onEdit={setEditingEquipment}
              onRefresh={loadEquipment}
              userRole={user.role}
            />
          ))}
        </div>

        {filteredEquipment.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum equipamento encontrado</p>
          </div>
        )}
      </div>

      {showAddForm && (
        <EquipmentForm
          onClose={() => setShowAddForm(false)}
          onSave={loadEquipment}
        />
      )}

      {editingEquipment && (
        <EquipmentForm
          equipment={editingEquipment}
          onClose={() => setEditingEquipment(null)}
          onSave={loadEquipment}
        />
      )}
    </div>
  );
}

// Ticket Management Component
function TicketManagement({ user }) {
  const [tickets, setTickets] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [equipment, setEquipment] = useState([]);

  useEffect(() => {
    loadTickets();
    loadEquipment();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await api.get('/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const loadEquipment = async () => {
    try {
      const response = await api.get('/equipment');
      setEquipment(response.data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Chamados de Análise</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          ➕ Novo Chamado
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              equipment={equipment}
              onRefresh={loadTickets}
              userRole={user.role}
            />
          ))}
        </div>

        {tickets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum chamado encontrado</p>
          </div>
        )}
      </div>

      {showAddForm && (
        <TicketForm
          equipment={equipment}
          onClose={() => setShowAddForm(false)}
          onSave={loadTickets}
        />
      )}
    </div>
  );
}

// Maintenance Management Component  
function MaintenanceManagement({ user }) {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, []);

  useEffect(() => {
    if (selectedEquipmentId) {
      loadMaintenanceRecords();
    } else {
      setMaintenanceRecords([]);
    }
  }, [selectedEquipmentId]);

  const loadEquipment = async () => {
    try {
      const response = await api.get('/equipment');
      setEquipment(response.data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  };

  const loadMaintenanceRecords = async () => {
    try {
      const response = await api.get(`/maintenance/equipment/${selectedEquipmentId}`);
      setMaintenanceRecords(response.data);
    } catch (error) {
      console.error('Error loading maintenance records:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manutenção</h2>
        {selectedEquipmentId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ➕ Nova Manutenção
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar Equipamento
          </label>
          <select
            value={selectedEquipmentId}
            onChange={(e) => setSelectedEquipmentId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Selecione um equipamento...</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} - {eq.manufacturer} {eq.model} ({eq.location})
              </option>
            ))}
          </select>
        </div>

        {selectedEquipmentId && (
          <div className="space-y-4">
            {maintenanceRecords.map((record) => (
              <MaintenanceCard key={record.id} record={record} />
            ))}

            {maintenanceRecords.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum registro de manutenção encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddForm && (
        <MaintenanceForm
          equipmentId={selectedEquipmentId}
          onClose={() => setShowAddForm(false)}
          onSave={loadMaintenanceRecords}
        />
      )}
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center">
        <div className={`${colorClasses[color]} rounded-lg p-3 mr-4`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EquipmentCard({ equipment, onEdit, onRefresh, userRole }) {
  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este equipamento?')) {
      try {
        await api.delete(`/equipment/${equipment.id}`);
        onRefresh();
      } catch (error) {
        console.error('Error deleting equipment:', error);
        alert('Erro ao excluir equipamento');
      }
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900">{equipment.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs ${getEquipmentStatusColor(equipment.status)}`}>
          {getEquipmentStatusLabel(equipment.status)}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <p><strong>Fabricante:</strong> {equipment.manufacturer}</p>
        <p><strong>Modelo:</strong> {equipment.model}</p>
        <p><strong>Serial:</strong> {equipment.serial_number}</p>
        <p><strong>Localização:</strong> {equipment.location}</p>
        {equipment.installation_date && (
          <p><strong>Instalação:</strong> {new Date(equipment.installation_date).toLocaleDateString('pt-BR')}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={() => onEdit(equipment)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ✏️ Editar
        </button>
        {userRole === 'admin' && (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            🗑️ Excluir
          </button>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, equipment, onRefresh, userRole }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const equipmentInfo = equipment.find(eq => eq.id === ticket.equipment_id);

  const handleStatusUpdate = async (newStatus) => {
    try {
      await api.put(`/tickets/${ticket.id}`, { status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
          <p className="text-sm text-gray-600">
            {equipmentInfo ? `${equipmentInfo.name} - ${equipmentInfo.location}` : 'Equipamento não encontrado'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
            {getPriorityLabel(ticket.priority)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <p>{isExpanded ? ticket.description : `${ticket.description.substring(0, 100)}...`}</p>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 mt-1"
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
        </button>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Criado em: {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
        {userRole === 'admin' && (
          <div className="space-x-2">
            {ticket.status === 'open' && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                className="text-yellow-600 hover:text-yellow-800"
              >
                🔄 Em Progresso
              </button>
            )}
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <button
                onClick={() => handleStatusUpdate('resolved')}
                className="text-green-600 hover:text-green-800"
              >
                ✅ Resolver
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MaintenanceCard({ record }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{record.maintenance_type === 'preventive' ? 'Manutenção Preventiva' : 'Manutenção Corretiva'}</h3>
          <p className="text-sm text-gray-600">{record.description}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${
          record.maintenance_type === 'preventive' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {record.maintenance_type === 'preventive' ? 'Preventiva' : 'Corretiva'}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>Realizada em:</strong> {new Date(record.performed_at).toLocaleDateString('pt-BR')}</p>
        {record.cost && <p><strong>Custo:</strong> R$ {record.cost.toFixed(2)}</p>}
        {record.next_maintenance_date && (
          <p><strong>Próxima manutenção:</strong> {new Date(record.next_maintenance_date).toLocaleDateString('pt-BR')}</p>
        )}
        {record.notes && <p><strong>Observações:</strong> {record.notes}</p>}
      </div>
    </div>
  );
}

// Form Components
function EquipmentForm({ equipment, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: equipment?.name || '',
    model: equipment?.model || '',
    manufacturer: equipment?.manufacturer || '',
    serial_number: equipment?.serial_number || '',
    description: equipment?.description || '',
    location: equipment?.location || '',
    status: equipment?.status || 'active',
    installation_date: equipment?.installation_date ? equipment.installation_date.split('T')[0] : '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (submitData.installation_date) {
        submitData.installation_date = new Date(submitData.installation_date).toISOString();
      }

      if (equipment) {
        await api.put(`/equipment/${equipment.id}`, submitData);
      } else {
        await api.post('/equipment', submitData);
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Erro ao salvar equipamento');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {equipment ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Equipamento</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="active">Ativo</option>
                  <option value="maintenance">Em Manutenção</option>
                  <option value="inactive">Inativo</option>
                  <option value="removed">Removido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Instalação</label>
                <input
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) => setFormData({...formData, installation_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {equipment ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TicketForm({ equipment, onClose, onSave }) {
  const [formData, setFormData] = useState({
    equipment_id: '',
    title: '',
    description: '',
    priority: 'medium',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tickets', formData);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Erro ao criar chamado');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Novo Chamado</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipamento</label>
              <select
                value={formData.equipment_id}
                onChange={(e) => setFormData({...formData, equipment_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Selecione um equipamento...</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} - {eq.manufacturer} {eq.model} ({eq.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Chamado</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Problema</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Criar Chamado
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function MaintenanceForm({ equipmentId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    equipment_id: equipmentId,
    maintenance_type: 'preventive',
    description: '',
    next_maintenance_date: '',
    cost: '',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (submitData.next_maintenance_date) {
        submitData.next_maintenance_date = new Date(submitData.next_maintenance_date).toISOString();
      }
      if (submitData.cost) {
        submitData.cost = parseFloat(submitData.cost);
      }

      await api.post('/maintenance', submitData);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      alert('Erro ao criar registro de manutenção');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Nova Manutenção</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Manutenção</label>
                <select
                  value={formData.maintenance_type}
                  onChange={(e) => setFormData({...formData, maintenance_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="preventive">Preventiva</option>
                  <option value="corrective">Corretiva</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Manutenção</label>
                <input
                  type="date"
                  value={formData.next_maintenance_date}
                  onChange={(e) => setFormData({...formData, next_maintenance_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Manutenção</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Utility functions
function getStatusColor(status) {
  const colors = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status) {
  const labels = {
    open: 'Aberto',
    in_progress: 'Em Progresso',
    resolved: 'Resolvido',
    closed: 'Fechado',
  };
  return labels[status] || status;
}

function getEquipmentStatusColor(status) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800',
    removed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getEquipmentStatusLabel(status) {
  const labels = {
    active: 'Ativo',
    maintenance: 'Manutenção',
    inactive: 'Inativo',
    removed: 'Removido',
  };
  return labels[status] || status;
}

function getPriorityColor(priority) {
  const colors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}

function getPriorityLabel(priority) {
  const labels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return labels[priority] || priority;
}

export default App;