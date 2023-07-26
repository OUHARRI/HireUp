import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import flowbitejs from '@salesforce/resourceUrl/flowbitejs';
import flowbitecss from '@salesforce/resourceUrl/flowbitecss';
import validateToken from '@salesforce/apex/TokenManager.validateToken';
import getIdsFromToken from '@salesforce/apex/TokenManager.getIdsFromToken';
import { loadStyle, loadScript } from 'lightning/platformResourceLoader';
import getQuizzesWithQuestionsAndOptions from '@salesforce/apex/QuizController.getQuizzesWithQuestionsAndOptions';
import quizePatternImage from '@salesforce/resourceUrl/quizePatternImage';

export default class QuizeLwc extends LightningElement {
    @track isQuizStarted = false;
    @track currentQuestion = 1;
    @track countDown = 30;
    @track question = '';
    @track imageBgLink = '';


    questions = [];
    answerOptions = [];
    quiz = { 'Name': 'QUIZ', 'Description__c': '', 'Duration__c': '' };

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.token = currentPageReference.state?.token;
            this.validateToken(currentPageReference.state?.token);
        }
    }

    token = null;
    timer = null;
    quizId = null;
    LeadId = null;

    @track MULTIPLE_CHOICE = false;
    @track TRUE_FALSE = false;
    @track SHORT_ANSWER = false;
    @track CURSOR = false;
    @track PUZZLE = false;
    @track SURVEY = false;

    QUESTION_TYPES = {
        MULTIPLE_CHOICE: 'multiple choice',
        TRUE_FALSE: 'true/false',
        SHORT_ANSWER: 'short answer',
        CURSOR: 'Cursor',
        PUZZLE: 'Puzzle',
        SURVEY: 'Sondage'
    };




    setCountDown = (value) => {
        return new Promise((resolve) => {
            this.countDown = value;
            resolve();
        });
    };

    setQuestions = (value) => {
        return new Promise((resolve) => {
            this.questions = value;
            resolve();
        });
    };

    setQuestion = (value) => {
        return new Promise((resolve) => {
            this.question = value;
            resolve();
        });
    };

    setQuiz = (value) => {
        return new Promise((resolve) => {
            this.quiz = value;
            resolve();
        });
    };

    setAnswerOptions = (value) => {
        return new Promise((resolve) => {
            this.answerOptions = value;
            resolve();
        });
    };

    async setQuestionType(value) {
        await this.SetDefaultQuestionType;
        return new Promise((resolve,) => {
            switch (value) {
                case this.QUESTION_TYPES.MULTIPLE_CHOICE:
                    this.MULTIPLE_CHOICE = true;
                    break;
                case this.QUESTION_TYPES.TRUE_FALSE:
                    this.TRUE_FALSE = true;
                    break;
                case this.QUESTION_TYPES.SHORT_ANSWER:
                    this.SHORT_ANSWER = true;
                    break;
                case this.QUESTION_TYPES.CURSOR:
                    this.CURSOR = true;
                    break;
                case this.QUESTION_TYPES.PUZZLE:
                    this.PUZZLE = true;
                    break;
                case this.QUESTION_TYPES.SURVEY:
                    this.SURVEY = true;
                    break;
                default:
                    this.MULTIPLE_CHOICE = true;
                    break;
            }
        });
    }

    incrementCurrentQuestion = () => {
        return new Promise((resolve) => {
            this.currentQuestion++;
            resolve();
        });
    };

    setDefaultQuestionType = new Promise((resolve) => {
        this.MULTIPLE_CHOICE = false;
        this.TRUE_FALSE = false;
        this.SHORT_ANSWER = false;
        this.CURSOR = false;
        this.PUZZLE = false;
        this.SURVEY = false;
        resolve();
    });


    get timerClass() {
        return this.countDown < 10 ? 'warning' : 'count-down';
    }

    renderedCallback() {
        Promise.all([
            loadStyle(this, flowbitecss),
            loadScript(this, flowbitejs),
        ])
            .then(() => {
                // Code à exécuter après le chargement des ressources
            })
            .catch(error => {
                console.error('Erreur lors du chargement des ressources :', error);
            });
    }

    async validateToken(token) {
        if (token) {
            try {
                const result = await validateToken({ encryptedToken: token });
                if (result) {
                    this.handleValidToken();
                } else {
                    this.handleInvalidToken(token);
                }
            } catch (error) {
                console.error('Erreur lors de la validation du token :', error);
            }
        } else {
            this.handleNoToken();
        }
    }


    // //////////////////// //

    async handleValidToken() {
        console.log('Token valide !');
        try {
            const result = await getIdsFromToken({ encryptedToken: this.token });
            if (result && result.QuizId && result.LeadId) {
                this.quizId = result.QuizId;
                this.LeadId = result.LeadId;
                await this.getQuizzes();
            } else {
                console.error('Invalid data retrieved from the token.');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des IDs :', error);
        }
    }

    handleInvalidToken() {
        console.error('Token invalide ou incomplet !');
    }

    handleNoToken() {
        console.error('Token non trouvé dans l\'URL !');
    }

    async countDownTimer() {
        if (this.countDown > 0) {
            this.timer = setTimeout(() => {
                this.countDown--;
                this.countDownTimer();
            }, 1000);
        } else if (this.countDown === 0) {
            if (this.currentQuestion === this.questions.length) {
                this.handleQuizEnd();
            } else {
                this.handleNextQuestion();
            }
        }
    }

    async openFullscreen() {

        await (this.template.querySelector('.app').requestFullscreen() ||
            this.template.querySelector('.app').webkitRequestFullscreen() ||
            this.template.querySelector('.app').mozRequestFullScreen() ||
            this.template.querySelector('.app').msRequestFullscreen());

    }

    closeFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    }

    handleQuizEnd() {
        // Code to handle the end of the quiz, show results, etc.
        // For example, clear the timer:
        clearTimeout(this.timer);
        this.countDown = 30;
        this.countDownTimer();
    }

    async handleNextQuestion() {
        await this.setCountDown(this.question.TimeLimit__c);

        clearTimeout(this.timer);

        await this.countDownTimer();

        await this.incrementCurrentQuestion();

        if (this.currentQuestion > this.questions.length) {
            this.handleQuizEnd();
        } else {
            await this.setQuestion(this.questions[this.currentQuestion - 1].question);
            await this.setAnswerOptions(this.questions[this.currentQuestion - 1].answerOptions);
            await this.setQuestionType(this.question.QuestionType__c);

            await this.countDownTimer();
        }
    }

    startQuiz() {
        this.isQuizStarted = true;
        this.countDownTimer();
        this.openFullscreen();
    }

    async getQuizzes() {
        try {
            const result = await getQuizzesWithQuestionsAndOptions({ quizId: this.quizId });

            if (result && result.quiz && result.questions) {

                await this.setQuiz(result.quiz);

                await this.setQuestions(result.questions);

                await this.setQuestion(this.questions[0].question);

                await this.setAnswerOptions(this.questions[0].answerOptions)

                await this.setQuestionType(this.question.QuestionType__c)

                await this.setCountDown(this.question.TimeLimit__c);

            } else {
                console.error('No quiz data found for the given quizId.');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des quizzes :', error);
        }
    }

    connectedCallback() {
        this.imageBgLink = `background-image: linear-gradient(
            to left top,
            rgb(255, 255, 255, 0.7),
            rgb(252, 252, 252, 0.7)
          ),url('${quizePatternImage}')`;
    }
}