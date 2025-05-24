// Variáveis globais
let editandoProduto = false;
let produtosAtuais = [];

// Funções de Interface
function mostrarFormulario() {
    const form = document.getElementById('productForm');
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
}

function esconderFormulario() {
    document.getElementById('productForm').style.display = 'none';
}

function cancelarEdicao() {
    esconderFormulario();
    limparFormulario();
}

function limparFormulario() {
    document.getElementById('productForm').reset();
    document.getElementById('especificacoesContainer').innerHTML = '';
    document.getElementById('produtoId').value = '';
    editandoProduto = false;
}

function atualizarEspecificacoes() {
    const tipo = document.getElementById('tipo').value;
    const container = document.getElementById('especificacoesContainer');
    container.innerHTML = '';

    if (!tipo) return;

    const especificacoes = {
        mouse: [
            { nome: 'sensor', label: 'Sensor' },
            { nome: 'peso', label: 'Peso (g)' },
            { nome: 'dpi', label: 'DPI' },
            { nome: 'tipo', label: 'Tipo (Com/Sem fio)' }
        ],
        teclado: [
            { nome: 'switch', label: 'Switch' },
            { nome: 'iluminacao', label: 'Iluminação' },
            { nome: 'tipo', label: 'Tipo (Mecânico/Membrana)' }
        ],
        headset: [
            { nome: 'driver', label: 'Driver' },
            { nome: 'microfone', label: 'Microfone' },
            { nome: 'tipo', label: 'Tipo (Com/Sem fio)' }
        ],
        mousepad: [
            { nome: 'tamanho', label: 'Tamanho' },
            { nome: 'espessura', label: 'Espessura (mm)' },
            { nome: 'material', label: 'Material' }
        ],
        monitor: [
            { nome: 'resolucao', label: 'Resolução' },
            { nome: 'taxa', label: 'Taxa de Atualização' },
            { nome: 'tamanho', label: 'Tamanho (polegadas)' }
        ],
        webcam: [
            { nome: 'resolucao', label: 'Resolução' },
            { nome: 'fps', label: 'FPS' },
            { nome: 'campo', label: 'Campo de Visão' }
        ]
    };

    especificacoes[tipo].forEach(spec => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label for="${spec.nome}">${spec.label}</label>
            <input type="text" id="${spec.nome}" name="${spec.nome}" required>
        `;
        container.appendChild(div);
    });
}

function obterEspecificacoes() {
    const especificacoes = {};
    const inputs = document.querySelectorAll('#especificacoesContainer input');
    inputs.forEach(input => {
        especificacoes[input.name] = input.value;
    });
    return especificacoes;
}

async function salvarProduto(event) {
    event.preventDefault();
    
    try {
        const nome = document.getElementById('nome').value.trim();
        const tipo = document.getElementById('tipo').value;
        const preco = document.getElementById('preco').value;
        const imagem = document.getElementById('imagem').value.trim();
        const urlProduto = document.getElementById('urlProduto').value.trim();

        if (!nome || !tipo || !preco || !imagem || !urlProduto) {
            alert('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        const especificacoes = obterEspecificacoes();
        if (Object.keys(especificacoes).length === 0) {
            alert('Por favor, preencha as especificações do produto');
            return;
        }

        const produto = {
            id: document.getElementById('produtoId').value ? parseInt(document.getElementById('produtoId').value) : undefined,
            nome,
            tipo,
            preco: parseFloat(preco),
            imagem,
            urlProduto,
            especificacoes
        };

        if (isNaN(produto.preco) || produto.preco <= 0) {
            alert('Por favor, insira um preço válido');
            return;
        }

        try {
            new URL(produto.imagem);
            new URL(produto.urlProduto);
        } catch (e) {
            alert('Por favor, insira URLs válidas para a imagem e o produto');
            return;
        }

        if (editandoProduto) {
            await GoogleSheetsDB.atualizar(produto);
            alert('Produto atualizado com sucesso!');
        } else {
            await GoogleSheetsDB.adicionar(produto);
            alert('Produto adicionado com sucesso!');
        }

        await atualizarTabela();
        esconderFormulario();
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto: ' + error.message);
    }
}

async function excluirProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
        await GoogleSheetsDB.excluir(parseInt(id));
        await atualizarTabela();
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto');
    }
}

async function atualizarTabela() {
    try {
        produtosAtuais = await GoogleSheetsDB.listarTodos();
        atualizarTabelaComProdutos(produtosAtuais);
    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
        mostrarNotificacao('Erro ao carregar produtos: ' + error.message, 'error');
    }
}

function atualizarTabelaComProdutos(produtos) {
    const tbody = document.getElementById('productsTableBody');
    
    tbody.innerHTML = produtos.map(produto => `
        <tr>
            <td>${produto.id}</td>
            <td>
                <img src="${produto.imagem}" alt="${produto.nome}" 
                     style="width: 50px; height: 50px; object-fit: contain; cursor: pointer;"
                     onclick="mostrarEspecificacoes(${JSON.stringify(produto)})">
            </td>
            <td>${produto.nome}</td>
            <td>${produto.tipo}</td>
            <td>R$ ${produto.preco.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <a href="${produto.urlProduto}" target="_blank" class="btn-link" title="Ver produto">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <button onclick="editarProduto(${produto.id})" class="btn-edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="excluirProduto(${produto.id})" class="btn-delete" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function mostrarNotificacao(mensagem, tipo = 'success') {
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao ${tipo}`;
    notificacao.textContent = mensagem;
    
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.remove();
    }, 3000);
}

async function editarProduto(id) {
    try {
        const produto = await GoogleSheetsDB.obterPorId(id);
        if (!produto) {
            mostrarNotificacao('Produto não encontrado', 'error');
            return;
        }
        
        document.getElementById('produtoId').value = produto.id;
        document.getElementById('nome').value = produto.nome;
        document.getElementById('tipo').value = produto.tipo;
        document.getElementById('preco').value = produto.preco;
        document.getElementById('imagem').value = produto.imagem;
        document.getElementById('urlProduto').value = produto.urlProduto;
        
        atualizarEspecificacoes();
        
        // Preencher especificações
        Object.entries(produto.especificacoes).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) input.value = value;
        });
        
        editandoProduto = true;
        mostrarFormulario();
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        mostrarNotificacao('Erro ao carregar produto: ' + error.message, 'error');
    }
}

// Função para filtrar produtos
function filtrarProdutos() {
    const filtro = document.getElementById('filtroProdutos').value.toLowerCase();
    const tipoFiltro = document.getElementById('filtroTipo').value;
    
    const produtosFiltrados = produtosAtuais.filter(produto => {
        const matchNome = produto.nome.toLowerCase().includes(filtro);
        const matchTipo = tipoFiltro === '' || produto.tipo === tipoFiltro;
        return matchNome && matchTipo;
    });
    
    atualizarTabelaComProdutos(produtosFiltrados);
}

// Função para mostrar especificações em um modal
function mostrarEspecificacoes(produto) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Especificações do ${produto.nome}</h2>
            <div class="especificacoes-grid">
                ${Object.entries(produto.especificacoes).map(([key, value]) => `
                    <div class="espec-item">
                        <strong>${key}:</strong> ${value}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close').onclick = () => {
        modal.remove();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await atualizarTabela();
        
        // Adicionar event listeners para filtros
        document.getElementById('filtroProdutos').addEventListener('input', filtrarProdutos);
        document.getElementById('filtroTipo').addEventListener('change', filtrarProdutos);
        
        // Adicionar event listener para o formulário
        document.getElementById('productForm').addEventListener('submit', salvarProduto);
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        mostrarNotificacao('Erro ao inicializar a página: ' + error.message, 'error');
    }
}); 