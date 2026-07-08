import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Páginas Públicas
import Home          from './pages/public/Home';
import Login         from './pages/public/Login';
import Cadastro      from './pages/public/Cadastro';
import ValidarCert   from './pages/public/ValidarCertificado';
import ValidarHash from './pages/public/ValidarHash';
import PrimeiroAcesso from './pages/public/PrimeiroAcesso';
import Biblioteca from './pages/public/Biblioteca';
import PesquisadoresNestPublico from './pages/public/PesquisadoresNest';

// Admin
import AdminDashboard    from './pages/admin/Dashboard';
import AdminFormacoes    from './pages/admin/Formacoes';
import AdminInscricoes   from './pages/admin/Inscricoes';
import AdminFrequencia   from './pages/admin/Frequencia';
import AdminCertificados from './pages/admin/Certificados';
import AdminUsuarios     from './pages/admin/Usuarios';
import AdminRelatorios   from './pages/admin/Relatorios';
import AdminLogs         from './pages/admin/Logs';
import AdminBiblioteca from './pages/admin/Biblioteca';
import BibliotecaNovo from './pages/admin/BibliotecaNovo';
import BibliotecaPainel from './pages/admin/BibliotecaPainel';
import AdminInventarioConsumo from './pages/admin/InventarioConsumo';
import AdminPesquisadoresNest from './pages/admin/PesquisadoresNest';
import PesquisaForm from './pages/admin/PesquisaForm';

// Coordenador
import CoordDashboard    from './pages/coordenador/Dashboard';
import CoordFormacoes    from './pages/coordenador/Formacoes';
import CoordInscricoes   from './pages/coordenador/Inscricoes';
import CoordFrequencia   from './pages/coordenador/Frequencia';
import CoordCertificados from './pages/coordenador/Certificados';
import CoordParticipantes from './pages/coordenador/Participantes';
import CoordRelatorios   from './pages/coordenador/Relatorios';
import CoordPropostasFormacao from './pages/coordenador/PropostasFormacao';
import CoordPropostaFormacaoDetalhe from './pages/coordenador/PropostaFormacaoDetalhe';
import CoordInventarioConsumo from './pages/coordenador/InventarioConsumo';

// Participante
import PartDashboard    from './pages/participante/Dashboard';
import PartFormacoes    from './pages/participante/Formacoes';
import PartInscricoes   from './pages/participante/Inscricoes';
import PartFrequencia   from './pages/participante/Frequencia';
import PartCertificados from './pages/participante/Certificados';
import PartPerfil       from './pages/participante/Perfil';
import CertificadoViewer from './pages/participante/CertificadoViewer'; // ADICIONADO

// Equipe
import EquipeFormacoes from './pages/equipe/Formacoes';
import EquipeDashboard from './pages/equipe/Dashboard';
import EquipeInscricoes from './pages/equipe/Inscricoes';
import EquipeCertificados from './pages/equipe/Certificados';
import EquipeParticipantes from './pages/equipe/Participantes';
import EquipeRelatorios from './pages/equipe/Relatorios';
import EquipeAgendarFormacao from './pages/equipe/AgendarFormacao';
import EquipeMinhasPropostas from './pages/equipe/MinhasPropostas';


// Common
import Notificacoes from './pages/common/Notificacoes';

function PrivateRoute({ children, tipos }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (tipos && !tipos.includes(user.tipo)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            
            {/* Públicas */}
            <Route path="/"                        element={<Home />} />
            <Route path="/login"                   element={<Login />} />
            <Route path="/cadastro"                element={<Cadastro />} />
            <Route path="/validar-certificado"     element={<ValidarCert />} />
            <Route path="/validar/:hash"           element={<ValidarHash />} />
            <Route path="/primeiro-acesso"        element={<PrimeiroAcesso />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            <Route path="/pesquisadores-nest" element={<PesquisadoresNestPublico />} />


            {/* Admin */}
            <Route path="/admin" element={<PrivateRoute tipos={['admin']}><AdminDashboard /></PrivateRoute>} />
            <Route path="/admin/formacoes"    element={<PrivateRoute tipos={['admin']}><AdminFormacoes /></PrivateRoute>} />
            <Route path="/admin/inscricoes"   element={<PrivateRoute tipos={['admin']}><AdminInscricoes /></PrivateRoute>} />
            <Route path="/admin/frequencia"   element={<PrivateRoute tipos={['admin']}><AdminFrequencia /></PrivateRoute>} />
            <Route path="/admin/certificados" element={<PrivateRoute tipos={['admin']}><AdminCertificados /></PrivateRoute>} />
            <Route path="/admin/usuarios"     element={<PrivateRoute tipos={['admin']}><AdminUsuarios /></PrivateRoute>} />
            <Route path="/admin/relatorios"   element={<PrivateRoute tipos={['admin']}><AdminRelatorios /></PrivateRoute>} />
            <Route path="/admin/logs"         element={<PrivateRoute tipos={['admin']}><AdminLogs /></PrivateRoute>} />
            <Route path="/admin/biblioteca-painel" element={<PrivateRoute tipos={['admin']}><BibliotecaPainel /></PrivateRoute>} />
            <Route path="/admin/biblioteca"element={<PrivateRoute tipos={['admin']}><AdminBiblioteca /></PrivateRoute>}/>
            <Route path="/admin/biblioteca/novo"element={<PrivateRoute tipos={['admin']}><BibliotecaNovo /></PrivateRoute>}/>
            <Route path="/admin/inventario-consumo"element={<PrivateRoute tipos={['admin']}><AdminInventarioConsumo /></PrivateRoute>}/>
            <Route path="/admin/pesquisadores-nest"element={<PrivateRoute tipos={['admin']}><AdminPesquisadoresNest /></PrivateRoute>}/>
            <Route path="/admin/biblioteca/pesquisa/nova"element={<PesquisaForm />}/>

            {/* Coordenador */}
            <Route path="/coordenador" element={<PrivateRoute tipos={['coordenador']}><CoordDashboard /></PrivateRoute>} />
            <Route path="/coordenador/formacoes"     element={<PrivateRoute tipos={['coordenador']}><CoordFormacoes /></PrivateRoute>} />
            <Route path="/coordenador/inscricoes"    element={<PrivateRoute tipos={['coordenador']}><CoordInscricoes /></PrivateRoute>} />
            <Route path="/coordenador/frequencia"    element={<PrivateRoute tipos={['coordenador']}><CoordFrequencia /></PrivateRoute>} />
            <Route path="/coordenador/certificados"  element={<PrivateRoute tipos={['coordenador']}><CoordCertificados /></PrivateRoute>} />
            <Route path="/coordenador/participantes" element={<PrivateRoute tipos={['coordenador']}><CoordParticipantes /></PrivateRoute>} />
            <Route path="/coordenador/relatorios"    element={<PrivateRoute tipos={['coordenador']}><CoordRelatorios /></PrivateRoute>} />
            <Route path="/coordenador/propostas-formacao"element={<PrivateRoute tipos={['coordenador']}><CoordPropostasFormacao /></PrivateRoute>}/>
            <Route path="/coordenador/propostas-formacao/:id"element={<PrivateRoute tipos={['coordenador']}><CoordPropostaFormacaoDetalhe /></PrivateRoute>}/>
            <Route path="/coordenador/notificacoes"element={<PrivateRoute tipos={['coordenador']}><Notificacoes /></PrivateRoute>}/>
            <Route path="/coordenador/inventario-consumo"element={<PrivateRoute tipos={['coordenador']}><CoordInventarioConsumo /></PrivateRoute>}/>

            {/* Participante */}
            <Route path="/participante" element={<PrivateRoute tipos={['participante']}><PartDashboard /></PrivateRoute>} />
            <Route path="/participante/formacoes"    element={<PrivateRoute tipos={['participante']}><PartFormacoes /></PrivateRoute>} />
            <Route path="/participante/inscricoes"   element={<PrivateRoute tipos={['participante']}><PartInscricoes /></PrivateRoute>} />
            <Route path="/participante/frequencia"   element={<PrivateRoute tipos={['participante']}><PartFrequencia /></PrivateRoute>} />
            <Route path="/participante/certificados" element={<PrivateRoute tipos={['participante']}><PartCertificados /></PrivateRoute>} />
            <Route path="/participante/perfil"       element={<PrivateRoute tipos={['participante']}><PartPerfil /></PrivateRoute>} />

            {/* Equipe */}
          <Route path="/equipe/formacoes"element={<PrivateRoute tipos={['equipe']}><EquipeFormacoes /></PrivateRoute>}/>
          <Route path="/equipe/dashboard"element={<PrivateRoute tipos={['equipe']}><EquipeDashboard /></PrivateRoute>}/>
          <Route path="/equipe/inscricoes"element={<PrivateRoute tipos={['equipe']}><EquipeInscricoes /></PrivateRoute>}/>
          <Route path="/equipe/certificados"element={<PrivateRoute tipos={['equipe']}><EquipeCertificados /></PrivateRoute>}/>
          <Route path="/equipe/participantes"element={<PrivateRoute tipos={['equipe']}><EquipeParticipantes /></PrivateRoute>}/>
          <Route path="/equipe/relatorios"element={<PrivateRoute tipos={['equipe']}><EquipeRelatorios /></PrivateRoute>}/>
          <Route path="/equipe"element={<PrivateRoute tipos={['equipe']}><EquipeDashboard /></PrivateRoute>}/>
          <Route path="/equipe/agendar-formacao"element={<PrivateRoute tipos={['equipe']}><EquipeAgendarFormacao /></PrivateRoute>}/>
          <Route path="/equipe/minhas-propostas"element={<PrivateRoute tipos={['equipe']}><EquipeMinhasPropostas /></PrivateRoute>}/>
          <Route path="/equipe/notificacoes"element={<PrivateRoute tipos={['equipe']}><Notificacoes /></PrivateRoute>}/>
          <Route path="/equipe"element={<PrivateRoute tipos={['equipe']}><EquipeDashboard /></PrivateRoute>}/>
          

            {/* Certificado Viewer - ADICIONADO */}
            <Route 
              path="/participante/certificados/:id/visualizar"
              element={
                <PrivateRoute tipos={['participante']}>
                  <CertificadoViewer />
                </PrivateRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}