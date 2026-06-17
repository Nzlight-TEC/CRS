import { supabase } from '../supabaseClient.js';

const RANKING_TABLE = 'ranking';

export const RANKING_MODES = {
  FINITE: 'finito',
  INFINITE: 'infinito'
};

export const normalizeRankingMode = (mode) => {
  const key = String(mode || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');

  if (key === 'infinito' || key === 'infinite' || key === 'endless') {
    return RANKING_MODES.INFINITE;
  }

  return RANKING_MODES.FINITE;
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('chaos_user') || '{}');
  } catch (error) {
    return {};
  }
};

const getUserInfo = async () => {
  const storedUser = getStoredUser();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  const nome = user?.user_metadata?.nome || storedUser.nome || user?.email || storedUser.email || 'Jogador';
  const email = user?.email || storedUser.email || null;

  return { user, nome, email };
};

const normalizeRankingRow = (row = {}, index = 0) => ({
  position: index + 1,
  modo: normalizeRankingMode(row.modo || row.mode),
  nome: row.nome || row.name || row.player_name || row.jogador || row.email || 'Jogador',
  maxPontuacao: row.max_pontuacao ?? row.pontuacao_max ?? row.max_score ?? row.pontuacao ?? row.score ?? 0,
  maxLevel: row.max_level ?? row.nivel_max ?? row.level_max ?? row.nivel ?? row.level ?? 1
});

const sortRows = (rows) => [...rows]
  .sort((a, b) => {
    const scoreDiff = Number(b.maxPontuacao) - Number(a.maxPontuacao);
    if (scoreDiff !== 0) return scoreDiff;
    return Number(b.maxLevel) - Number(a.maxLevel);
  })
  .map((row, index) => ({ ...row, position: index + 1 }));

export const fetchRankings = async (limit = 10, mode = RANKING_MODES.FINITE) => {
  const rankingMode = normalizeRankingMode(mode);
  const { data, error } = await supabase
    .from(RANKING_TABLE)
    .select('*')
    .eq('modo', rankingMode)
    .limit(50);

  if (error) {
    console.warn('Nao foi possivel carregar o ranking:', error.message);
    return [];
  }

  return sortRows((data || []).map(normalizeRankingRow)).slice(0, limit);
};

const getComparableRows = async ({ userId, email, nome, mode }) => {
  const filters = [
    userId ? ['user_id', userId] : null,
    email ? ['email', email] : null,
    nome ? ['nome', nome] : null
  ].filter(Boolean);

  for (const [column, value] of filters) {
    const { data, error } = await supabase
      .from(RANKING_TABLE)
      .select('*')
      .eq('modo', mode)
      .eq(column, value)
      .limit(1);

    if (!error) {
      return {
        rows: data || [],
        matchColumn: column,
        matchValue: value
      };
    }
  }

  return {
    rows: [],
    matchColumn: null,
    matchValue: null
  };
};

const buildPayloadAttempts = ({ userId, nome, email, mode, maxPontuacao, maxLevel }) => [
  {
    user_id: userId,
    modo: mode,
    nome,
    email,
    max_pontuacao: maxPontuacao,
    max_level: maxLevel,
    updated_at: new Date().toISOString()
  },
  {
    user_id: userId,
    modo: mode,
    nome,
    email,
    max_pontuacao: maxPontuacao,
    max_level: maxLevel
  },
  {
    modo: mode,
    nome,
    email,
    max_pontuacao: maxPontuacao,
    max_level: maxLevel
  },
  {
    modo: mode,
    nome,
    max_pontuacao: maxPontuacao,
    max_level: maxLevel
  },
  {
    modo: mode,
    nome,
    email,
    pontuacao: maxPontuacao,
    nivel: maxLevel
  },
  {
    modo: mode,
    nome,
    pontuacao: maxPontuacao,
    nivel: maxLevel
  },
  {
    modo: mode,
    nome,
    email,
    pontuacao: maxPontuacao,
    level: maxLevel
  },
  {
    modo: mode,
    nome,
    pontuacao: maxPontuacao,
    level: maxLevel
  },
  {
    modo: mode,
    name: nome,
    email,
    score: maxPontuacao,
    level: maxLevel
  },
  {
    modo: mode,
    name: nome,
    score: maxPontuacao,
    level: maxLevel
  },
  {
    modo: mode,
    jogador: nome,
    pontuacao: maxPontuacao,
    nivel: maxLevel
  }
].map((payload) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
));

export const saveBestRanking = async ({ pontuacao = 0, level = 1, mode = RANKING_MODES.FINITE } = {}) => {
  const runPontuacao = Math.max(0, Math.floor(pontuacao));
  const runLevel = Math.max(1, Math.floor(level));
  const rankingMode = normalizeRankingMode(mode);
  const { user, nome, email } = await getUserInfo();
  const userId = user?.id || null;

  const { rows, matchColumn, matchValue } = await getComparableRows({
    userId,
    email,
    nome,
    mode: rankingMode
  });
  const current = normalizeRankingRow(rows[0]);
  const maxPontuacao = Math.max(runPontuacao, Number(current.maxPontuacao) || 0);
  const maxLevel = Math.max(runLevel, Number(current.maxLevel) || 1);
  const attempts = buildPayloadAttempts({
    userId,
    nome,
    email,
    mode: rankingMode,
    maxPontuacao,
    maxLevel
  });
  const errors = [];

  for (const payload of attempts) {
    let query = rows.length && matchColumn
      ? supabase.from(RANKING_TABLE).update(payload).eq('modo', rankingMode).eq(matchColumn, matchValue)
      : supabase.from(RANKING_TABLE).insert(payload);

    const { error } = await query;

    if (!error) {
      console.log('Ranking salvo:', payload);
      return true;
    }

    errors.push(error.message);
  }

  console.warn('Ranking nao salvo. Ultimo erro:', errors[errors.length - 1]);
  console.warn('Confira se a tabela ranking permite INSERT/UPDATE para usuario autenticado e se possui colunas de nome, pontuacao e nivel.');
  return false;
};
