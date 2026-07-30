// ================================================================
//  Основное приложение – логика тестирования, PDF через html2pdf
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
    //  ГЕНЕРАЦИЯ PDF ЧЕРЕЗ html2pdf (АВТОМАТИЧЕСКИ)
    // -------------------------------------------------------------
    function generatePDF(fio, position, topicLabel, results, correctCount, total, passed) {
        // Проверка загрузки html2pdf
        if (typeof html2pdf === 'undefined') {
            alert('Библиотека html2pdf не загружена. Проверьте подключение скриптов или повторите попытку позже.');
            return;
        }

        const date = new Date().toLocaleDateString('ru-RU');
        const percent = Math.round((correctCount / total) * 100);

        // Скрытый контейнер для рендеринга
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: 210mm;
            padding: 20px;
            background: white;
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;
        document.body.appendChild(container);

        // Формируем HTML-содержимое
        let html = `
            <h1 style="text-align:center; font-size:24px; margin-bottom:5px;">ЛИСТ ПРОХОЖДЕНИЯ ТЕСТИРОВАНИЯ</h1>
            <p style="text-align:center; font-size:16px; margin-bottom:15px;">по охране труда (строительная компания)</p>
            <p><strong>Тема:</strong> ${topicLabel}</p>
            <p><strong>ФИО работника:</strong> ${fio}</p>
            <p><strong>Должность:</strong> ${position}</p>
            <p><strong>Дата тестирования:</strong> ${date}</p>
            <p style="font-size:18px; font-weight:bold; color:${passed ? 'green' : 'red'}; text-align:center; margin:15px 0;">
                РЕЗУЛЬТАТ: ${correctCount} из ${total} правильных (${percent}%) — ${passed ? 'ЗАЧТЕНО' : 'НЕ ЗАЧТЕНО'}
            </p>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background-color:#1a3e60; color:white;">
                        <th style="padding:6px; border:1px solid #ddd; text-align:center;">№</th>
                        <th style="padding:6px; border:1px solid #ddd; text-align:left;">Вопрос</th>
                        <th style="padding:6px; border:1px solid #ddd; text-align:left;">Ваш ответ</th>
                        <th style="padding:6px; border:1px solid #ddd; text-align:left;">Правильный ответ</th>
                        <th style="padding:6px; border:1px solid #ddd; text-align:center;">Статус</th>
                    </tr>
                </thead>
                <tbody>
        `;
        results.forEach((r, idx) => {
            const userText = (r.userIndex !== -1) ? r.options[r.userIndex] : 'Не выбран';
            const correctText = r.options[r.correctIndex];
            const status = r.isCorrect ? 'Верно' : 'Неверно';
            const color = r.isCorrect ? 'green' : 'red';
            const bg = idx % 2 === 0 ? '#f9f9f9' : 'white';
            html += `
                <tr style="background-color:${bg};">
                    <td style="padding:4px; border:1px solid #ddd; text-align:center;">${idx+1}</td>
                    <td style="padding:4px; border:1px solid #ddd; text-align:left;">${r.question}</td>
                    <td style="padding:4px; border:1px solid #ddd; text-align:left;">${userText}</td>
                    <td style="padding:4px; border:1px solid #ddd; text-align:left;">${correctText}</td>
                    <td style="padding:4px; border:1px solid #ddd; text-align:center; color:${color}; font-weight:bold;">${status}</td>
                </tr>
            `;
        });
        html += `
                </tbody>
            </table>
            <p style="margin-top:30px;">Подпись работника: _________________</p>
            <p>Подпись ответственного лица: _________________</p>
        `;
        container.innerHTML = html;

        // Даём время на отрисовку
        setTimeout(() => {
            const opt = {
                margin:        [10, 10, 10, 10],
                filename:     `Тестирование_${topicLabel.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${date.replace(/\./g, '-')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(container).save().then(() => {
                document.body.removeChild(container);
            }).catch(err => {
                console.error('Ошибка генерации PDF:', err);
                alert('Не удалось создать PDF. Попробуйте ещё раз.');
                document.body.removeChild(container);
            });
        }, 1500);
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

        // Автоматическая генерация PDF через html2pdf
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
