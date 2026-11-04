import { hashSenha } from './sha256';

// Mesma carga inicial do script .sql do banco (INSERTs), para o modo demonstração.
export function criarDadosIniciais() {
  const agora = Date.now();
  const minAtras = (m) => new Date(agora - m * 60000).toISOString();

  const bairros = [
    { id: 1, nome: 'Jardim Pantanal', cidade: 'São Paulo', zona: 'Leste', corpoHidrico: 'Rio Tietê', cotaTransbordamentoCm: 400, nivelAlerta: 'NORMAL' },
    { id: 2, nome: 'Jardim Romano', cidade: 'São Paulo', zona: 'Leste', corpoHidrico: 'Rio Tietê', cotaTransbordamentoCm: 380, nivelAlerta: 'NORMAL' },
    { id: 3, nome: 'Vila Itaim', cidade: 'São Paulo', zona: 'Leste', corpoHidrico: 'Córrego Itaim', cotaTransbordamentoCm: 250, nivelAlerta: 'NORMAL' },
    { id: 4, nome: 'Parque Novo Mundo', cidade: 'São Paulo', zona: 'Norte', corpoHidrico: 'Rio Tietê', cotaTransbordamentoCm: 420, nivelAlerta: 'NORMAL' },
    { id: 5, nome: 'Vila Prudente', cidade: 'São Paulo', zona: 'Leste', corpoHidrico: 'Córrego da Mooca', cotaTransbordamentoCm: 220, nivelAlerta: 'NORMAL' },
  ];

  const siglas = { 1: 'PANT', 2: 'ROMA', 3: 'ITAI', 4: 'NMUN', 5: 'PRUD' };
  const sensores = [];
  let idSensor = 1;
  for (const b of bairros) {
    sensores.push({ id: idSensor++, codigo: `RIO-${siglas[b.id]}-01`, tipo: 'NIVEL_RIO', unidade: 'cm', bairroId: b.id, descricao: `Nível do ${b.corpoHidrico}`, ativo: true });
    sensores.push({ id: idSensor++, codigo: `PLU-${siglas[b.id]}-01`, tipo: 'PLUVIOMETRO', unidade: 'mm/h', bairroId: b.id, descricao: 'Pluviômetro (chuva)', ativo: true });
  }

  // Histórico curto de leituras normais
  const leituras = [];
  let idLeitura = 1;
  for (const s of sensores) {
    const b = bairros.find((x) => x.id === s.bairroId);
    for (let i = 6; i >= 1; i--) {
      const valor = s.tipo === 'NIVEL_RIO' ? Math.round(b.cotaTransbordamentoCm * (0.35 + Math.random() * 0.1)) : Math.round(Math.random() * 4 * 10) / 10;
      leituras.push({ id: idLeitura++, sensorId: s.id, valor, registradaEm: minAtras(i * 10) });
    }
  }

  const sal = (email) => `sal-${email}`;
  const usuarios = [
    { id: 1, nome: 'Defesa Civil (Admin)', email: 'admin@alertabairro.com', perfil: 'ADMIN', bairroId: null, sal: sal('admin@alertabairro.com'), senhaHash: hashSenha('Admin@123', sal('admin@alertabairro.com')) },
    { id: 2, nome: 'Maria Souza', email: 'maria@email.com', perfil: 'CIDADAO', bairroId: 1, sal: sal('maria@email.com'), senhaHash: hashSenha('Maria@123', sal('maria@email.com')) },
    { id: 3, nome: 'João Lima', email: 'joao@email.com', perfil: 'CIDADAO', bairroId: 1, sal: sal('joao@email.com'), senhaHash: hashSenha('Joao@123', sal('joao@email.com')) },
  ];

  const reportes = [
    { id: 1, usuarioId: 3, bairroId: 1, rua: 'Rua Capachós, altura do nº 120', gravidade: 'CANELA', descricao: 'Boca de lobo entupida, água acumulando na esquina.', status: 'PENDENTE', confirmacoes: [], criadoEm: minAtras(25), atualizadoEm: minAtras(25) },
    { id: 2, usuarioId: 3, bairroId: 3, rua: 'Av. Marechal Tito, próximo ao viaduto', gravidade: 'CALCADA', descricao: '', status: 'RESOLVIDO', confirmacoes: [], criadoEm: minAtras(60 * 26), atualizadoEm: minAtras(60 * 20) },
  ];

  const alertas = [
    { id: 1, bairroId: 3, nivel: 'ATENCAO', origem: 'SENSOR', mensagem: 'Chuva forte registrada no pluviômetro PLU-ITAI-01.', ativo: false, criadoEm: minAtras(60 * 26), encerradoEm: minAtras(60 * 22) },
  ];

  return { bairros, sensores, leituras, usuarios, reportes, alertas, sessoes: {}, proximoId: { leitura: idLeitura, usuario: 4, reporte: 3, alerta: 2 } };
}
