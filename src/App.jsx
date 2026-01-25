import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ModeloDetalle from './pages/ModeloDetalle';
import Contacto from './pages/Contacto';
import Sorteo from './pages/Sorteo';
import Login from './pages/Login';
import Admin from './pages/Admin';
import FormularioModelo from './pages/FormularioModelo';
import ConfirmarEmail from './pages/ConfirmarEmail';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="modelo/:id" element={<ModeloDetalle />} />
        <Route path="contacto" element={<Contacto />} />
        <Route path="sorteo" element={<Sorteo />} />
        <Route path="confirmar" element={<ConfirmarEmail />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="login" element={<Login />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/modelos/nuevo"
          element={
            <ProtectedRoute>
              <FormularioModelo />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/modelos/:id"
          element={
            <ProtectedRoute>
              <FormularioModelo />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
