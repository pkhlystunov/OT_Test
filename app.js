// ================================================================
//  Основное приложение – логика тестирования, генерация PDF через iframe
// ================================================================

(function() {
    // -------------------------------------------------------------
    //  ФУНКЦИЯ ГЕНЕРАЦИИ 40+ ВОПРОСОВ НА ОСНОВЕ БАЗОВЫХ
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
    //  НОВАЯ ФУНКЦИЯ ГЕНЕРАЦИИ PDF ЧЕРЕЗ IFRAME
    // -------------------------------------------------------------
    function generatePDF(fio, position, topicLabel, results, correctCount, total, passed) {
        const date = new Date().toLocaleDateString('ru-RU');
        const percent = Math.round((correctCount / total) * 100);

        // Формируем HTML-код для PDF
        let content = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; background: white; }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 5px; }
                    .subtitle { text-align: center; font-size: 16px; margin-bottom: 15px; }
                    .info { margin: 4px 0; }
                    .result { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
                    .result.pass { color: green; }
                    .result.fail { color: red; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background-color: #1a3e60; color: white; padding: 6px; border: 1px solid #ddd; text-align: center; }
                    td { padding: 4px; border: 1px solid #ddd; text-align: left; }
                    .center { text-align: center; }
                    .status-pass { color: green; font-weight: bold; }
                    .status-fail { color: red; font-weight: bold; }
                    .signature { margin-top: 30px; }
                </style>
            </head>
            <body>
                <h1>ЛИСТ ПРОХОЖДЕНИЯ ТЕСТИРОВАНИЯ</h1>
                <p class="subtitle">по охране труда (строительная компания)</p>
                <p class="info"><strong>Тема:</strong> ${topicLabel}</p>
                <p class="info"><strong>ФИО работника:</strong> ${fio}</p>
                <p class="info"><strong>Должность:</strong> ${position}</p>
                <p class="info"><strong>Дата тестирования:</strong> ${date}</p>
                <p class="result ${passed ? 'pass' : 'fail'}">
                    РЕЗУЛЬТАТ: ${correctCount} из ${total} правильных (${percent}%) — ${passed ? 'ЗАЧТЕНО' : 'НЕ ЗАЧТЕНО'}
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Вопрос</th>
                            <th>Ваш ответ</th>
                            <th>Правильный ответ</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        results.forEach((r, idx) => {
            const userText = (r.userIndex !== -1) ? r.options[r.userIndex] : 'Не выбран';
            const correctText = r.options[r.correctIndex];
            const status = r.isCorrect ? 'Верно' : 'Неверно';
            const statusClass = r.isCorrect ? 'status-pass' : 'status-fail';
            const bg = idx % 2 === 0 ? '#f9f9f9' : 'white';
            content += `
                <tr style="background-color:${bg};">
                    <td class="center">${idx+1}</td>
                    <td>${r.question}</td>
                    <td>${userText}</td>
                    <td>${correctText}</td>
                    <td class="center ${statusClass}">${status}</td>
                </tr>
            `;
        });
        content += `
                    </tbody>
                </table>
                <p class="signature">Подпись работника: _________________</p>
                <p class="signature">Подпись ответственного лица: _________________</p>
            </body>
            </html>
        `;

        // Создаём iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position: absolute; left: 0; top: 0; width: 210mm; height: 297mm; border: none; visibility: hidden;';
        document.body.appendChild(iframe);

        // Записываем содержимое в iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(content);
        iframeDoc.close();

        // Даём время на загрузку
        setTimeout(() => {
            // Захватываем содержимое iframe
            html2canvas(iframe.contentWindow.document.body, {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                logging: false,
                width: 210 * 2.83, // ~595px (A4 ширина в пикселях при scale=2)
                height: 297 * 2.83  // ~842px
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                const fileName = `Тестирование_${topicLabel.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${date.replace(/\./g, '-')}.pdf`;
                pdf.save(fileName);
                document.body.removeChild(iframe);
            }).catch(err => {
                console.error('Ошибка захвата iframe:', err);
                alert('Не удалось создать PDF. Попробуйте ещё раз.');
                document.body.removeChild(iframe);
            });
        }, 800); // задержка для полной загрузки iframe
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

        // Генерируем PDF через iframe
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
