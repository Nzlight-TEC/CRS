import { supabase } from '../supabaseClient.js';

export default class RegisterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RegisterScene' });
  }

  create() {
    const { width, height } = this.scale;
    const isCompact = height < 760;
    const titleY = isCompact ? 42 : 70;
    const boxWidth = Math.min(540, width * 0.9);
    const boxTop = isCompact ? 86 : 112;
    const boxHeight = Math.min(isCompact ? 500 : 590, height - boxTop - 70);
    const boxY = boxTop + boxHeight / 2;
    const inputWidth = Math.min(340, boxWidth - 64, width * 0.82);
    const inputHeight = isCompact ? 42 : 48;
    const fieldGap = isCompact ? 56 : 70;
    const buttonHeight = isCompact ? 48 : 56;
    const labelY = boxTop + (isCompact ? 34 : 46);
    const firstInputY = boxTop + (isCompact ? 88 : 112);
    const nomeY = firstInputY;
    const emailY = nomeY + fieldGap;
    const senhaY = emailY + fieldGap;
    const confirmarY = senhaY + fieldGap;
    const statusY = confirmarY + (isCompact ? 45 : 54);
    const buttonY = statusY + (isCompact ? 42 : 50);
    const linkY = Math.min(height - 26, boxY + boxHeight / 2 + 30);
    this.cameras.main.setBackgroundColor('#080a10');

    // Fundo animado
    this.createBackground();

    // Título com animação
    const titulo = this.add.text(width / 2, titleY, 'CHAOS RUSH', {
      fontSize: Math.min(isCompact ? 42 : 52, width * 0.12) + 'px',
      color: '#00ffff',
      fontStyle: 'bold',
      fontFamily: 'Tektur'
    }).setOrigin(0.5);
    titulo.setAlpha(0);
    this.tweens.add({
      targets: titulo,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut'
    });

    // Container principal
    const containerBox = this.add.rectangle(width/2, boxY, boxWidth, boxHeight, 0x000000, 0.78);
    containerBox.setStrokeStyle(3, 0x00ffff);
    containerBox.setAlpha(0);
    
    this.tweens.add({
      targets: containerBox,
      alpha: 1,
      duration: 800,
      ease: 'Power2.easeOut',
      delay: 100
    });

    // Efeito de brilho
    this.createGlowEffect(containerBox, width/2, boxY);

    // Label REGISTRE-SE
    const labelRegister = this.add.text(width / 2, labelY, 'REGISTRE-SE', {
      fontSize: Math.min(isCompact ? 26 : 34, width * 0.08) + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Tektur'
    }).setOrigin(0.5);
    labelRegister.setAlpha(0);
    this.tweens.add({
      targets: labelRegister,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 200
    });

    // Estilos responsivos
    const inputStyle = `
      width: ${inputWidth}px;
      height: ${inputHeight}px;
      padding: 12px 16px;
      border-radius: 10px;
      border: 2px solid #00ffff;
      background: rgba(17, 17, 17, 0.8);
      color: #fff;
      font-size: 16px;
      font-family: 'Arial', sans-serif;
      transition: all 0.3s ease;
      box-sizing: border-box;
      backdrop-filter: blur(4px);
    `;

    // Input Nome
    const nome = this.add.dom(width / 2, nomeY).createFromHTML(`
      <input id='nome' type='text' placeholder='Nome Completo' style='${inputStyle}'>
    `);
    nome.setAlpha(0);
    this.tweens.add({
      targets: nome,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 250
    });

    // Input Email
    const email = this.add.dom(width / 2, emailY).createFromHTML(`
      <input id='email' type='email' placeholder='E-mail' style='${inputStyle}'>
    `);
    email.setAlpha(0);
    this.tweens.add({
      targets: email,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 300
    });

    // Input Senha
    const senha = this.add.dom(width / 2, senhaY).createFromHTML(`
      <div style='position:relative;width:${inputWidth}px;height:${inputHeight}px;'>
        <input id='senha' type='password' placeholder='Senha' style='${inputStyle} padding-right: 50px;'>
        <button id='toggle-senha' type='button' aria-label='Mostrar senha' style='position:absolute;right:12px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:none;background:transparent;color:#00ffff;font-size:20px;cursor:pointer;transition:all 0.2s ease;'>👁️</button>
      </div>
    `);
    senha.setAlpha(0);
    this.tweens.add({
      targets: senha,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 350
    });

    // Input Confirmar Senha
    const confirmar = this.add.dom(width / 2, confirmarY).createFromHTML(`
      <div style='position:relative;width:${inputWidth}px;height:${inputHeight}px;'>
        <input id='confirmar-senha' type='password' placeholder='Confirmar Senha' style='${inputStyle} padding-right: 50px;'>
        <button id='toggle-confirmar-senha' type='button' aria-label='Mostrar senha' style='position:absolute;right:12px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:none;background:transparent;color:#00ffff;font-size:20px;cursor:pointer;transition:all 0.2s ease;'>👁️</button>
      </div>
    `);
    confirmar.setAlpha(0);
    this.tweens.add({
      targets: confirmar,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 400
    });

    // Get inputs
    const nomeInput = nome.node.querySelector('#nome');
    const emailInput = email.node.querySelector('#email');
    const senhaInput = senha.node.querySelector('#senha');
    const toggleSenha = senha.node.querySelector('#toggle-senha');
    const confirmarInput = confirmar.node.querySelector('#confirmar-senha');
    const toggleConfirmarSenha = confirmar.node.querySelector('#toggle-confirmar-senha');

    // Focus events para todos os inputs
    [nomeInput, emailInput, senhaInput, confirmarInput].forEach(input => {
      input.addEventListener('focus', () => {
        input.style.borderColor = '#00ffff';
        input.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
        input.style.background = 'rgba(17, 17, 17, 1)';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = '#00ffff';
        input.style.boxShadow = 'none';
        input.style.background = 'rgba(17, 17, 17, 0.8)';
      });
    });

    // Toggle de senha
    toggleSenha.addEventListener('click', () => {
      const mostrando = senhaInput.type === 'text';
      senhaInput.type = mostrando ? 'password' : 'text';
      toggleSenha.style.transform = 'translateY(-50%) scale(1.2)';
      this.time.delayedCall(100, () => {
        toggleSenha.style.transform = 'translateY(-50%)';
      });
    });

    toggleConfirmarSenha.addEventListener('click', () => {
      const mostrando = confirmarInput.type === 'text';
      confirmarInput.type = mostrando ? 'password' : 'text';
      toggleConfirmarSenha.style.transform = 'translateY(-50%) scale(1.2)';
      this.time.delayedCall(100, () => {
        toggleConfirmarSenha.style.transform = 'translateY(-50%)';
      });
    });

    // Botão CADASTRAR
    const cadastrar = this.add.rectangle(width / 2, buttonY, inputWidth, buttonHeight, 0x00aaff, 0.8);
    cadastrar.setStrokeStyle(2, 0x00ffff);
    cadastrar.setInteractive({ useHandCursor: true });

    const textoCadastrar = this.add.text(width / 2, buttonY, 'CADASTRAR', {
      fontSize: Math.min(24, width * 0.06) + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Tektur'
    }).setOrigin(0.5);

    cadastrar.setAlpha(0);
    textoCadastrar.setAlpha(0);
    this.tweens.add({
      targets: [cadastrar, textoCadastrar],
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 450
    });

    // Hover effects
    cadastrar.on('pointerover', () => {
      this.tweens.add({
        targets: cadastrar,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      this.tweens.add({
        targets: textoCadastrar,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      cadastrar.setFillStyle(0x00ffff, 0.9);
      textoCadastrar.setColor('#000000');
    });

    cadastrar.on('pointerout', () => {
      this.tweens.add({
        targets: cadastrar,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      this.tweens.add({
        targets: textoCadastrar,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      cadastrar.setFillStyle(0x00aaff, 0.8);
      textoCadastrar.setColor('#ffffff');
    });

    // Status message
    const status = this.add.text(width / 2, statusY, '', {
      fontSize: Math.min(16, width * 0.04) + 'px',
      color: '#ffff00',
      fontStyle: 'bold',
      wordWrap: { width: inputWidth, useAdvancedWrap: true }
    }).setOrigin(0.5);

    const updateStatus = (message, type = 'info') => {
      status.setText(message);
      const colors = {
        'info': '#ffff00',
        'error': '#ff4444',
        'success': '#44ff44',
        'loading': '#00ffff'
      };
      status.setColor(colors[type] || colors['info']);
    };

    // Loading spinner
    let loadingSpinner = null;
    const showLoading = (show) => {
      if(show && !loadingSpinner) {
        loadingSpinner = this.add.text(width/2 - inputWidth / 2 + 28, buttonY, '⟳', {
          fontSize: `${isCompact ? 24 : 32}px`,
          color: '#00ffff'
        }).setOrigin(0.5);
        
        this.tweens.add({
          targets: loadingSpinner,
          angle: 360,
          duration: 1000,
          repeat: -1,
          ease: 'Linear'
        });
      } else if(!show && loadingSpinner) {
        loadingSpinner.destroy();
        loadingSpinner = null;
      }
    };

    // Lógica de cadastro
    cadastrar.on('pointerdown', async () => {
      const nomeValue = nomeInput.value.trim();
      const emailValue = emailInput.value.trim();
      const senhaValue = senhaInput.value.trim();
      const confirmarValue = confirmarInput.value.trim();

      // Validações
      if (!nomeValue) {
        updateStatus('Digite seu nome', 'error');
        return;
      }

      if (!emailValue) {
        updateStatus('Digite seu e-mail', 'error');
        return;
      }

      if (!emailValue.includes('@')) {
        updateStatus('E-mail inválido', 'error');
        return;
      }

      if (!senhaValue) {
        updateStatus('Digite uma senha', 'error');
        return;
      }

      if (senhaValue.length < 6) {
        updateStatus('Senha deve ter 6+ caracteres', 'error');
        return;
      }

      if (senhaValue !== confirmarValue) {
        updateStatus('Senhas não coincidem', 'error');
        return;
      }

      cadastrar.disableInteractive();
      updateStatus('Criando conta...', 'loading');
      showLoading(true);

      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailValue,
          password: senhaValue,
          options: {
            data: {
              nome: nomeValue
            }
          }
        });

        if (error) {
          console.error('Erro ao registrar:', error);
          updateStatus(error.message || 'Erro ao registrar', 'error');
          showLoading(false);
          cadastrar.setInteractive({ useHandCursor: true });
          return;
        }

        if (data.user && !data.session) {
          updateStatus('✓ Verifique seu e-mail!', 'success');
        } else {
          updateStatus('✓ Conta criada! Faça login.', 'success');
        }

        showLoading(false);
        this.time.delayedCall(2000, () => this.scene.start('LoginScene'));
      } catch(err) {
        updateStatus('Erro de conexão', 'error');
        showLoading(false);
        cadastrar.setInteractive({ useHandCursor: true });
      }
    });

    // Suporte para Enter
    this.input.keyboard.on('keydown-ENTER', () => {
      cadastrar.emit('pointerdown');
    });

    // Link para login
    const loginLink = this.add.text(width / 2, linkY, 'Já tem conta? Faça login', {
      fontSize: Math.min(16, width * 0.04) + 'px',
      color: '#88ccff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    loginLink.setAlpha(0);
    this.tweens.add({
      targets: loginLink,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 500
    });

    loginLink.on('pointerover', () => {
      loginLink.setColor('#00ffff');
      loginLink.setScale(1.1);
    });
    loginLink.on('pointerout', () => {
      loginLink.setColor('#88ccff');
      loginLink.setScale(1);
    });
    loginLink.on('pointerdown', () => {
      this.scene.start('LoginScene');
    });
  }

  createBackground() {
    const { width, height } = this.scale;
    
    for(let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      const particle = this.add.circle(x, y, size, 0x00ffff, 0.3);
      
      this.tweens.add({
        targets: particle,
        y: y + Math.random() * 100,
        alpha: 0,
        duration: 3000 + Math.random() * 2000,
        repeat: -1,
        delay: Math.random() * 1000
      });
    }
  }

  createGlowEffect(box, x, y) {
    const glowCircle = this.add.circle(x, y, 300, 0x00ffff, 0);
    glowCircle.setStrokeStyle(2, 0x00ffff);
    glowCircle.setAlpha(0.1);
    
    this.tweens.add({
      targets: glowCircle,
      scaleX: 1.05,
      scaleY: 1.05,
      alpha: 0.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}
