require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const ejs = require('ejs');
const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require('@google/generative-ai');

// Inicializando o Express
const app = express();
const MODEL_NAME = 'gemini-2.0-flash';
const API_KEY = process.env.API_KEY_GEMINI; 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.render('index');
});

// Inicializando o servidor HTTP com o Express
const server = http.createServer(app);

// Inicializando o servidor do Socket.io
const io = socketIo(server);

// Configurando o servidor do Socket.io para receber mensagens
io.on('connection', (socket) => {
    console.log('Novo usuário conectado');

    socket.on('message', async (data) => {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const generationConfig = {
            temperature: 1,
            topK: 0,
            topP: 0.95,
            maxOutputTokens: 8192,
        };

        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            }
        ];

        const chat = model.startChat({
            generationConfig,
            safetySettings,
            history: [], // Histórico vazio para começar
        });

        try {
            const result = await chat.sendMessage(data); // Envia a mensagem para o chat
            const response = await result.response; // Obtém a resposta
            const text = response.text(); // Extrai o texto da resposta

            // Envia a resposta de volta para o cliente
            socket.emit('message', text);
        } catch (error) {
            console.error('Erro ao enviar mensagem para o Gemini:', error);
            socket.emit('message', 'Erro ao processar sua mensagem.');
        }
    });
});

// Inicializando o servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// Captura erros globais não tratados
process.on('uncaughtException', (error) => {
    console.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promessa rejeitada não tratada:', reason);
});