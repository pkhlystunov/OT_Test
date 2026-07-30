// ================================================================
//  Основное приложение – логика тестирования, генерация PDF через pdfmake
// ================================================================

(function() {
    // -------------------------------------------------------------
    //  ГЕНЕРАЦИЯ 40+ ВОПРОСОВ НА ОСНОВЕ БАЗОВЫХ
    // -------------------------------------------------------------
    function generateFullQuestions(topicKey) {
        if (!baseQuestions[topicKey]) return [];
        const base = baseQuestions[topicKey].qs;
        let full = [];
        base.forEach(b => {
            full.push({ question: b.question, options: b.options.slice(), correct: b.correct });
        });

        let count = full.length;
        while (full.length < 40) {
            const orig = full[count % full.length];
            let newQ = '';
            const prefixes = ['Каковы особенности ', 'Назовите основные ', 'Что включает в себя ', 'Как обеспечивается ', 'Какие требования к '];
            const suffix = ' (вариант)';
            let baseText = orig.question;
            if (baseText.endsWith('?')) baseText = baseText.slice(0, -1);
            newQ = prefixes[full.length % prefixes.length] + baseText.toLowerCase() + '?' + suffix;
            let shuffledOpts = orig.options.slice();
            for (let i = shuffledOpts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
            }
            const correctAns = orig.options[orig.correct];
            const newCorrect = shuffledOpts.indexOf(correctAns);
            full.push({ question: newQ, options: shuffledOpts, correct: newCorrect });
            count++;
        }
        return full;
    }

    // -------------------------------------------------------------
    //  ТЕМЫ (метаданные)
    // -------------------------------------------------------------
    const topicMeta = {};
    for (const key in baseQuestions) {
        topicMeta[key] = baseQuestions[key].label;
    }

    // -------------------------------------------------------------
    //  СОСТОЯНИЕ
    // -------------------------------------------------------------
    let currentTopicKey = null;
    let fullQuestions = [];
    let selectedQuestions = [];
    let userAnswers = [];
    let testFinished = false;

    const topicSelect = document.getElementById('topicSelect');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const finishBtn = document.getElementById('finishBtn');
    const finishHint = document.getElementById('finishHint');
    const questionsArea = document.getElementById('questionsArea');
    const finishArea = document.getElementById('finishArea');
    const resultArea = document.getElementById('resultArea');
    const personFields = document.getElementById('personFields');
    const fioInput = document.getElementById('fioInput');
    const positionInput = document.getElementById('positionInput');

    // -------------------------------------------------------------
    //  ИНИЦИАЛИЗАЦИЯ
    // -------------------------------------------------------------
    function populateTopics() {
        topicSelect.innerHTML = '';
        for (const key in topicMeta) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = topicMeta[key];
            topicSelect.appendChild(opt);
        }
        if (topicSelect.options.length > 0) topicSelect.selectedIndex = 0;
    }
    populateTopics();

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function resetTest() {
        currentTopicKey = null;
        fullQuestions = [];
        selectedQuestions = [];
        userAnswers = [];
        testFinished = false;
        questionsArea.innerHTML = '';
        questionsArea.classList.add('hidden');
        finishArea.classList.add('hidden');
        resultArea.classList.add('hidden');
        resultArea.innerHTML = '';
        personFields.classList.add('hidden');
        fioInput.value = '';
        positionInput.value = '';
        finishBtn.disabled = true;
        finishHint.textContent = '';
    }

    function startTest() {
        resetTest();
        const key = topicSelect.value;
        if (!key || !topicMeta[key]) {
            alert('Выберите тему.');
            return;
        }
        currentTopicKey = key;
        fullQuestions = generateFullQuestions(key);
        if (fullQuestions.length === 0) {
            alert('Вопросы не найдены.');
            return;
        }
        const shuffled = shuffleArray(fullQuestions.slice());
        selectedQuestions = shuffled.slice(0, 5);
        userAnswers = new Array(selectedQuestions.length).fill(-1);
        testFinished = false;

        personFields.classList.remove('hidden');
        renderQuestions();
        questionsArea.classList.remove('hidden');
        finishArea.classList.remove('hidden');
        resultArea.classList.add('hidden');
        finishBtn.disabled = true;
        finishHint.textContent = 'Заполните ФИО, должность и ответьте на все вопросы';
        checkCompletion();
    }

    function renderQuestions() {
        if (!selectedQuestions.length) {
            questionsArea.innerHTML = '<p>Нет вопросов.</p>';
            return;
        }
        let html = '';
        selectedQuestions.forEach((q, idx) => {
            html += `<div class="question-block" data-qidx="${idx}">`;
            html += `<p>${idx+1}. ${q.question}</p>`;
            q.options.forEach((opt, optIdx) => {
                const checked = (userAnswers[idx] === optIdx) ? 'checked' : '';
                html += `<label>
                    <input type="radio" name="q${idx}" value="${optIdx}" ${checked} data-qidx="${idx}" data-optidx="${optIdx}">
                    ${opt}
                </label>`;
            });
            html += `</div>`;
        });
        questionsArea.innerHTML = html;

        const radios = questionsArea.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
            radio.addEventListener('change', function(e) {
                const qIdx = parseInt(this.dataset.qidx);
                const optIdx = parseInt(this.dataset.optidx);
                if (!isNaN(qIdx) && !isNaN(optIdx)) {
                    userAnswers[qIdx] = optIdx;
                    checkCompletion();
                }
            });
        });
    }

    function checkCompletion() {
        if (testFinished) {
            finishBtn.disabled = true;
            finishHint.textContent = 'Тест завершён';
            return;
        }
        const fio = fioInput.value.trim();
        const position = positionInput.value.trim();
        const allAnswered = userAnswers.every(ans => ans !== -1);
        const fieldsFilled = fio.length > 0 && position.length > 0;

        if (fieldsFilled && allAnswered) {
            finishBtn.disabled = false;
            finishHint.textContent = '';
        } else {
            finishBtn.disabled = true;
            let hint = '';
            if (!fieldsFilled) hint += 'Заполните ФИО и должность. ';
            if (!allAnswered) hint += 'Ответьте на все вопросы.';
            finishHint.textContent = hint;
        }
    }

    fioInput.addEventListener('input', checkCompletion);
    positionInput.addEventListener('input', checkCompletion);

    // -------------------------------------------------------------
    //  ГЕНЕРАЦИЯ PDF С ПОМОЩЬЮ pdfmake
    // -------------------------------------------------------------
    function generatePDF(fio, position, topicLabel, results, correctCount, total, passed) {
        const date = new Date().toLocaleDateString('ru-RU');
        const percent = Math.round((correctCount / total) * 100);

        // Формируем таблицу
        const tableBody = results.map((r, idx) => {
            const userText = (r.userIndex !== -1) ? r.options[r.userIndex] : 'Не выбран';
            const correctText = r.options[r.correctIndex];
            const status = r.isCorrect ? 'Верно' : 'Неверно';
            return [
                { text: (idx+1).toString(), alignment: 'center' },
                { text: r.question, alignment: 'left' },
                { text: userText, alignment: 'left' },
                { text: correctText, alignment: 'left' },
                { text: status, alignment: 'center', color: r.isCorrect ? '#1e7e34' : '#b13e3e' }
            ];
        });

        const docDefinition = {
            content: [
                { text: 'ЛИСТ ПРОХОЖДЕНИЯ ТЕСТИРОВАНИЯ', style: 'header', alignment: 'center' },
                { text: 'по охране труда (строительная компания)', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 15] },
                { text: `Тема: ${topicLabel}`, style: 'info' },
                { text: `ФИО работника: ${fio}`, style: 'info' },
                { text: `Должность: ${position}`, style: 'info' },
                { text: `Дата тестирования: ${date}`, style: 'info', margin: [0, 0, 0, 10] },
                { 
                    text: `РЕЗУЛЬТАТ: ${correctCount} из ${total} правильных (${percent}%) — ${passed ? 'ЗАЧТЕНО' : 'НЕ ЗАЧТЕНО'}`,
                    style: 'result',
                    alignment: 'center',
                    margin: [0, 0, 0, 12]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [25, '*', 100, 100, 55],
                        body: [
                            [
                                { text: '№', style: 'tableHeader', alignment: 'center' },
                                { text: 'Вопрос', style: 'tableHeader', alignment: 'left' },
                                { text: 'Ваш ответ', style: 'tableHeader', alignment: 'left' },
                                { text: 'Правильный ответ', style: 'tableHeader', alignment: 'left' },
                                { text: 'Статус', style: 'tableHeader', alignment: 'center' }
                            ],
                            ...tableBody
                        ]
                    },
                    layout: {
                        fillColor: function(rowIndex) {
                            return (rowIndex % 2 === 0) ? '#F3F5F8' : null;
                        }
                    }
                },
                { text: `\nПодпись работника: _________________`, style: 'signature', margin: [0, 20, 0, 0] },
                { text: `Подпись ответственного лица: _________________`, style: 'signature' }
            ],
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
                subheader: { fontSize: 14, bold: false, margin: [0, 0, 0, 10] },
                info: { fontSize: 12, bold: false, margin: [0, 0, 0, 2] },
                result: { fontSize: 14, bold: true, color: passed ? '#1e7e34' : '#b13e3e' },
                tableHeader: { bold: true, fontSize: 11, fillColor: '#1a3e60', color: 'white' },
                signature: { fontSize: 12, bold: false, margin: [0, 2, 0, 0] }
            },
            defaultStyle: {
                font: 'Roboto' // используем встроенный шрифт Roboto из vfs_fonts
            }
        };

        // Скачиваем PDF
        pdfmake.createPdf(docDefinition).download(`Тестирование_${topicLabel.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${date.replace(/\./g, '-')}.pdf`);
    }

    // -------------------------------------------------------------
    //  ЗАВЕРШЕНИЕ ТЕСТА
    // -------------------------------------------------------------
    function finishTest() {
        if (testFinished) return;
        const fio = fioInput.value.trim();
        const position = positionInput.value.trim();
        if (!fio || !position) {
            alert('Заполните ФИО и должность.');
            return;
        }
        const unanswered = userAnswers.some(ans => ans === -1);
        if (unanswered) {
            if (!confirm('Вы ответили не на все вопросы. Завершить тест всё равно?')) {
                return;
            }
        }

        testFinished = true;
        finishBtn.disabled = true;
        finishHint.textContent = 'Тест завершён';

        const results = [];
        let correctCount = 0;
        selectedQuestions.forEach((q, idx) => {
            const userAns = userAnswers[idx];
            const isCorrect = (userAns === q.correct);
            if (isCorrect) correctCount++;
            results.push({
                question: q.question,
                options: q.options,
                userIndex: userAns,
                correctIndex: q.correct,
                isCorrect: isCorrect
            });
        });
        const total = results.length;
        const percent = Math.round((correctCount / total) * 100);
        const passed = percent >= 70;

        // Отображение на экране
        let resultHtml = `<div class="result-summary">
            <strong>Тема:</strong> ${topicMeta[currentTopicKey]}<br>
            <strong>ФИО:</strong> ${fio}<br>
            <strong>Должность:</strong> ${position}<br>
            <strong>Правильных ответов:</strong> ${correctCount} из ${total} (${percent}%)<br>
            <strong>Результат:</strong> ${passed ? '✅ ЗАЧТЕНО' : '❌ НЕ ЗАЧТЕНО'}
        </div>`;
        resultHtml += `<div style="margin-bottom:10px; font-weight:600;">Детали ответов:</div>`;
        resultHtml += `<div id="resultList">`;
        results.forEach((r, idx) => {
            const userText = (r.userIndex !== -1) ? r.options[r.userIndex] : '— (не выбран)';
            const correctText = r.options[r.correctIndex];
            const statusClass = r.isCorrect ? 'correct' : 'wrong';
            const statusText = r.isCorrect ? '✔ Верно' : '✘ Неверно';
            resultHtml += `<div class="result-item">
                <span class="q">${idx+1}. ${r.question}</span>
                <span class="user-answer">Ваш ответ: ${userText}</span>
                <span class="correct-answer">Правильный: ${correctText}</span>
                <span class="status ${statusClass}">${statusText}</span>
            </div>`;
        });
        resultHtml += `</div>`;
        resultHtml += `<div style="margin-top:15px;">
            <button class="btn print-btn" onclick="window.print()">🖨️ Печать</button>
            <span style="margin-left:15px; color:#1a6b3b;">PDF автоматически скачан</span>
        </div>`;

        resultArea.innerHTML = resultHtml;
        resultArea.classList.remove('hidden');

        const radios = questionsArea.querySelectorAll('input[type="radio"]');
        radios.forEach(r => r.disabled = true);

        // Генерация PDF через pdfmake
        generatePDF(fio, position, topicMeta[currentTopicKey], results, correctCount, total, passed);
    }

    // -------------------------------------------------------------
    //  ОБРАБОТЧИКИ
    // -------------------------------------------------------------
    startBtn.addEventListener('click', startTest);
    resetBtn.addEventListener('click', resetTest);
    finishBtn.addEventListener('click', finishTest);
    topicSelect.addEventListener('change', resetTest);

    resetTest();
})();
