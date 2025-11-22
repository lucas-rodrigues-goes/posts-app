const API_BASE_URL = 'http://localhost:4000';
const APP_CONFIG = {
    appName: 'Dream',
    backgroundColor: '#442b7d',
};

class PublicationApp {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.currentUser = localStorage.getItem('currentUser');
        console.log('App initialized. Token exists:', !!this.token);
        this.applyConfig();
        this.init();
    }

    applyConfig() {
        // Apply background color
        document.body.style.backgroundColor = APP_CONFIG.backgroundColor;
        
        // Update app name
        const title = document.querySelector('title');
        title.textContent = APP_CONFIG.appName
        const titles = document.querySelectorAll('h1');
        titles.forEach(title => {
            title.textContent = APP_CONFIG.appName;
        });
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    bindEvents() {
        // Login/Register forms
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('show-register').addEventListener('click', (e) => this.showScreen('register-screen'));
        document.getElementById('show-login').addEventListener('click', (e) => this.showScreen('login-screen'));

        // Posts screen
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        document.getElementById('create-post-form').addEventListener('submit', (e) => this.handleCreatePost(e));
    }

    checkAuth() {
        console.log('Checking auth...');
        if (this.token && this.currentUser) {
            console.log('User is authenticated, showing posts screen');
            this.showScreen('posts-screen');
            this.loadPublications();
        } else {
            console.log('User not authenticated, showing login screen');
            this.showScreen('login-screen');
        }
    }

    showScreen(screenName) {
        console.log('Showing screen:', screenName);
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenName).classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('Login attempt started');
        
        const formData = new FormData(e.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        console.log('Sending login request for:', credentials.username);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            console.log('Login response status:', response.status);
            const data = await response.json();
            console.log('Login response data:', data);

            if (response.ok) {
                this.token = data.token;
                this.currentUser = credentials.username;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('currentUser', this.currentUser);
                this.showMessage('login-message', 'Login realizado com sucesso!', 'success');
                setTimeout(() => {
                    this.showScreen('posts-screen');
                    this.loadPublications();
                }, 1000);
            } else {
                this.showMessage('login-message', 'Falha no login', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('register-message', 'Registro realizado com sucesso! Por favor faça login.', 'success');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        console.log('Register attempt started');
        
        const formData = new FormData(e.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        console.log('Sending register request for:', credentials.username);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            console.log('Register response status:', response.status);
            const data = await response.json();
            console.log('Register response data:', data);

            if (response.ok) {
                this.showMessage('register-message', 'Registration successful! Please login.', 'success');
                setTimeout(() => {
                    this.showScreen('login-screen');
                    document.getElementById('username').value = credentials.username;
                }, 1500);
            } else {
                this.showMessage('register-message', data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showMessage('register-message', 'Network error. Cannot connect to server.', 'error');
        }
    }

    handleLogout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.showScreen('login-screen');
    }

    async loadPublications() {
        console.log('Loading publications...');
        try {
            const response = await fetch(`${API_BASE_URL}/publication`, {
                headers: {
                    'Authorization': this.token
                }
            });

            console.log('Publications response status:', response.status);
            const data = await response.json();
            console.log('Publications response data:', data);

            if (response.ok) {
                this.displayPublications(data.publications);
            } else {
                console.error('Failed to load publications:', data.error);
                alert('Failed to load publications: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading publications:', error);
            alert('Network error. Cannot connect to server.');
        }
    }

    displayPublications(publications) {
        const container = document.getElementById('posts-container');
        
        if (publications.length === 0) {
            container.innerHTML = '<p>Nenhuma publicação ainda. Seja o primeiro a publicar!</p>';
            return;
        }

        container.innerHTML = publications.map(post => `
            <div class="post" data-id="${post.id}">
                <div class="post-header">
                    <div>
                        <div class="post-title">${this.escapeHtml(post.title)}</div>
                        <div class="post-author">${this.escapeHtml(post.username)}</div>
                    </div>
                    <div class="post-date">${new Date(post.created_at).toLocaleDateString()}</div>
                </div>
                <div class="post-content">${this.escapeHtml(post.text)}</div>
                ${post.username === this.currentUser ? `
                    <div class="post-actions">
                        <button class="btn-edit" onclick="app.editPost(${post.id})">Edit</button>
                        <button class="btn-delete" onclick="app.deletePost(${post.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async handleCreatePost(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const postData = {
            title: formData.get('title'),
            text: formData.get('text')
        };

        try {
            const response = await fetch(`${API_BASE_URL}/publication`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token
                },
                body: JSON.stringify(postData)
            });

            const data = await response.json();

            if (response.ok) {
                e.target.reset();
                this.loadPublications();
            } else {
                alert('Failed to create publication: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this publication?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/publication/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': this.token
                }
            });

            if (response.ok) {
                this.loadPublications();
            } else {
                const data = await response.json();
                alert('Failed to delete publication: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    }

    editPost(postId) {
        const postElement = document.querySelector(`.post[data-id="${postId}"]`);
        const title = postElement.querySelector('.post-title').textContent;
        const content = postElement.querySelector('.post-content').textContent;

        postElement.innerHTML = `
            <form class="edit-form" onsubmit="app.handleEditPost(event, ${postId})">
                <div class="form-group">
                    <label>Title:</label>
                    <input type="text" value="${this.escapeHtml(title)}" required>
                </div>
                <div class="form-group">
                    <label>Content:</label>
                    <textarea rows="4" required>${this.escapeHtml(content)}</textarea>
                </div>
                <div class="edit-actions">
                    <button type="submit" class="btn-edit">Save</button>
                    <button type="button" class="btn-cancel" onclick="app.cancelEdit(${postId})">Cancel</button>
                </div>
            </form>
        `;
    }

    async handleEditPost(e, postId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        const updateData = {
            title: form.querySelector('input').value,
            text: form.querySelector('textarea').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/publication/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.loadPublications();
            } else {
                const data = await response.json();
                alert('Failed to update publication: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    }

    cancelEdit(postId) {
        this.loadPublications();
    }

    showMessage(elementId, message, type) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';

        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the app
const app = new PublicationApp();