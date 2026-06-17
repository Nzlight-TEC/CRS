import { supabase } from '../supabaseClient.js';

export default class LoginScene extends Phaser.Scene {
  constructor(){ super({ key:'LoginScene' }); }

  create(){
    const { width, height } = this.scale;
    const isCompact = height < 680;
    const titleY = isCompact ? 48 : 80;
    const boxWidth = Math.min(520, width * 0.9);
    const boxHeight = Math.min(isCompact ? 410 : 470, height - 130);
    const boxY = titleY + 56 + boxHeight / 2;
    const boxTop = boxY - boxHeight / 2;
    const inputWidth = Math.min(340, boxWidth - 64, width * 0.82);
    const inputHeight = isCompact ? 44 : 48;
    const buttonHeight = isCompact ? 50 : 56;
    const labelY = boxTop + (isCompact ? 42 : 54);
    const emailY = boxTop + (isCompact ? 110 : 128);
    const senhaY = emailY + (isCompact ? 62 : 80);
    const statusY = senhaY + (isCompact ? 52 : 58);
    const buttonY = statusY + (isCompact ? 48 : 50);
    const linkY = Math.min(height - 28, boxY + boxHeight / 2 + 34);
    this.cameras.main.setBackgroundColor('#080a10');

    // Fundo animado com partículas
    this.createBackground();

    // Título com animação de entrada
    const titulo = this.add.text(width/2, titleY, 'CHAOS RUSH', {
      fontSize: Math.min(52, width * 0.12) + 'px',
      color:'#00ffff',
      fontStyle:'bold',
      fontFamily:'Tektur'
    }).setOrigin(0.5);
    titulo.setAlpha(0);
    this.tweens.add({
      targets: titulo,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut'
    });

    // Container principal com borda animada
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

    // Efeito de brilho na borda
    this.createGlowEffect(containerBox, width/2, boxY);

    // Label LOGIN
    const labelLogin = this.add.text(width/2, labelY, 'LOGIN', {
      fontSize: Math.min(isCompact ? 28 : 34, width * 0.08) + 'px',
      color:'#ffffff',
      fontStyle:'bold',
      fontFamily:'Tektur'
    }).setOrigin(0.5);
    labelLogin.setAlpha(0);
    this.tweens.add({
      targets: labelLogin,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 200
    });

    // Inputs com estilos responsivos
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

    const email = this.add.dom(width/2, emailY).createFromHTML(`
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

    const senha = this.add.dom(width/2, senhaY).createFromHTML(`
      <div style='position:relative;width:${inputWidth}px;height:${inputHeight}px;'>
        <input id='senha' type='password' placeholder='Senha' style='${inputStyle} padding-right: auto;'>
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

    const emailInput = email.node.querySelector('#email');
    const senhaInput = senha.node.querySelector('#senha');
    const toggleSenha = senha.node.querySelector('#toggle-senha');

    // Event listeners para inputs
    [emailInput, senhaInput].forEach(input => {
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

    toggleSenha.addEventListener('click', () => {
      const mostrando = senhaInput.type === 'text';
      senhaInput.type = mostrando ? 'password' : 'text';
      toggleSenha.style.transform = 'translateY(-50%) scale(1.2)';
      this.time.delayedCall(100, () => {
        toggleSenha.style.transform = 'translateY(-50%)';
      });
    });

    // Botão ENTRAR com feedback visual
    const entrar = this.add.rectangle(width/2, buttonY, inputWidth, buttonHeight, 0x00aaff, 0.8);
    entrar.setStrokeStyle(2, 0x00ffff);
    entrar.setInteractive({ useHandCursor: true });

    const textoEntrar = this.add.text(width/2, buttonY, 'ENTRAR', {
      fontSize: Math.min(24, width * 0.06) + 'px',
      color:'#ffffff',
      fontStyle:'bold',
      fontFamily:'Tektur'
    }).setOrigin(0.5);

    entrar.setAlpha(0);
    textoEntrar.setAlpha(0);
    this.tweens.add({
      targets: [entrar, textoEntrar],
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 400
    });

    // Hover effects do botão
    entrar.on('pointerover', () => {
      this.tweens.add({
        targets: entrar,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      this.tweens.add({
        targets: textoEntrar,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      entrar.setFillStyle(0x00ffff, 0.9);
      textoEntrar.setColor('#000000');
    });

    entrar.on('pointerout', () => {
      this.tweens.add({
        targets: entrar,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      this.tweens.add({
        targets: textoEntrar,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      entrar.setFillStyle(0x00aaff, 0.8);
      textoEntrar.setColor('#ffffff');
    });

    // Indicador de status com cores dinâmicas
    const status = this.add.text(width/2, statusY, '', {
      fontSize: Math.min(16, width * 0.04) + 'px',
      color: '#ffff00',
      fontStyle:'bold',
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

    const executarLogin = async () => {
      const emailValue = emailInput.value.trim();
      const senhaValue = senhaInput.value.trim();

      if(!emailValue || !senhaValue){
        updateStatus('Preencha e-mail e senha', 'error');
        return;
      }

      if(!emailValue.includes('@')){
        updateStatus('E-mail inválido', 'error');
        return;
      }

      entrar.disableInteractive();
      updateStatus('Conectando...', 'loading');
      showLoading(true);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailValue,
          password: senhaValue
        });

        if(error){
          updateStatus(error.message || 'Erro ao autenticar', 'error');
          showLoading(false);
          entrar.setInteractive({ useHandCursor: true });
          return;
        }

        if(!data || !data.session){
          updateStatus('Falha no login', 'error');
          showLoading(false);
          entrar.setInteractive({ useHandCursor: true });
          return;
        }

        const userName = data.user?.user_metadata?.nome || data.user?.email || '';
        localStorage.setItem('chaos_user', JSON.stringify({
          email: data.user.email,
          nome: userName
        }));

        updateStatus('✓ Login realizado!', 'success');
        showLoading(false);
        this.time.delayedCall(1000, () => this.scene.start('MenuScene'));
      } catch(err) {
        updateStatus('Erro de conexão', 'error');
        showLoading(false);
        entrar.setInteractive({ useHandCursor: true });
      }
    };

    entrar.on('pointerdown', executarLogin);

    // Suporte para Enter
    this.input.keyboard.on('keydown-ENTER', executarLogin);

    // Link para registro
    const registerLink = this.add.text(width/2, linkY, 'Não tem conta? Registrar', {
      fontSize: Math.min(16, width * 0.04) + 'px',
      color: '#88ccff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    registerLink.setAlpha(0);
    this.tweens.add({
      targets: registerLink,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut',
      delay: 450
    });

    registerLink.on('pointerover', () => {
      registerLink.setColor('#00ffff');
      registerLink.setScale(1.1);
    });
    registerLink.on('pointerout', () => {
      registerLink.setColor('#88ccff');
      registerLink.setScale(1);
    });
    registerLink.on('pointerdown', () => {
      this.scene.start('RegisterScene');
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
