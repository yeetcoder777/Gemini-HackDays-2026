import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      background: 'linear-gradient(135deg, var(--background) 0%, var(--secondary) 100%)',
      padding: '24px',
    },
    card: {
      width: '100%',
      maxWidth: '420px',
      backgroundColor: 'var(--card)',
      borderRadius: '24px',
      padding: '40px',
      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1)',
      position: 'relative',
      overflow: 'hidden',
    },
    header: {
      marginBottom: '32px',
      textAlign: 'center',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: 'var(--foreground)',
      marginBottom: '8px',
      letterSpacing: '-0.5px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    subtitle: {
      color: 'var(--muted-foreground)',
      fontSize: '16px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: 'var(--foreground)',
      marginLeft: '4px',
    },
    inputWrapper: {
      position: 'relative',
    },
    inputIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--muted-foreground)',
      width: '20px',
      height: '20px',
    },
    input: {
      width: '100%',
      padding: '14px 16px 14px 48px',
      borderRadius: '16px',
      border: '2px solid var(--border)',
      backgroundColor: 'var(--input)',
      color: 'var(--foreground)',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.2s ease',
    },
    button: {
      marginTop: '12px',
      padding: '16px',
      borderRadius: '16px',
      border: 'none',
      backgroundColor: 'var(--primary)',
      color: 'white',
      fontSize: '16px',
      fontWeight: '600',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      opacity: isLoading ? 0.7 : 1,
      boxShadow: '0 4px 12px var(--primary-light)',
    },
    toggleContainer: {
      marginTop: '24px',
      textAlign: 'center',
      color: 'var(--muted-foreground)',
      fontSize: '14px',
    },
    toggleLink: {
      color: 'var(--primary)',
      fontWeight: '600',
      cursor: 'pointer',
      marginLeft: '4px',
      border: 'none',
      background: 'none',
    },
    error: {
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      color: 'var(--destructive)',
      padding: '12px',
      borderRadius: '12px',
      fontSize: '14px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    logo: {
      width: '48px',
      height: '48px',
      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '24px',
      boxShadow: '0 8px 16px var(--primary-light)',
    }
  };

  const API_URL = 'http://localhost:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Successful auth
      if (data.access_token) {
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ email: '', password: '', username: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={styles.logo}>
            <Sparkles color="white" size={28} />
          </div>
        </div>

        <div style={styles.header}>
          <h1 style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={styles.subtitle}>
            {isLogin
              ? 'Enter your credentials to access your AI companion'
              : 'Start your journey with your personal AI companion'}
          </p>
        </div>

        {error && (
          <div style={styles.error}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form style={styles.form} onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <div style={styles.inputWrapper}>
                <User style={styles.inputIcon} />
                <input
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail style={styles.inputIcon} />
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock style={styles.inputIcon} />
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            style={styles.button}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px var(--primary-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px var(--primary-light)';
            }}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Sign Up'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div style={styles.toggleContainer}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button style={styles.toggleLink} onClick={toggleMode}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
