import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, ArrowRight, Send, Home, CheckCircle } from "lucide-react";

// Quiz questions data
const questions = [
  {
    number: 1,
    text: "Un altro allenatore ti tradisce in una lotta:",
    options: [
      { letter: "a", text: "Penso che molti allenatori siano egoisti" },
      { letter: "b", text: "Provo a capire perché l'ha fatto" },
      { letter: "c", text: "Mi agito e continuo a pensarci" },
      { letter: "d", text: "Mi arrabbio e lo sfido subito" },
      { letter: "e", text: "Faccio finta di niente e vado avanti" }
    ]
  },
  {
    number: 2,
    text: "Un compagno di viaggio è in difficoltà:",
    options: [
      { letter: "a", text: "Mi fermo ad aiutarlo senza pensarci" },
      { letter: "b", text: "Deve imparare a cavarsela da solo" },
      { letter: "c", text: "Mi preoccupo troppo per lui" },
      { letter: "d", text: "Gli dico di reagire e allenarsi di più" },
      { letter: "e", text: "Evito la situazione per non stare male" }
    ]
  },
  {
    number: 3,
    text: "Durante una disputa tra allenatori:",
    options: [
      { letter: "a", text: "Divento duro per difendere le mie idee" },
      { letter: "b", text: "Cerco pace a tutti i costi" },
      { letter: "c", text: "Mi sento in colpa" },
      { letter: "d", text: "Voglio dimostrare di essere il migliore" },
      { letter: "e", text: "Provo a mediare come un vero capopalestra" }
    ]
  },
  {
    number: 4,
    text: "Ti fidi degli altri allenatori?",
    options: [
      { letter: "a", text: "Poco, molti pensano solo alle medaglie" },
      { letter: "b", text: "Sì, parto sempre positivo" },
      { letter: "c", text: "Solo se mi danno sicurezza" },
      { letter: "d", text: "Mi fido... ma tengo io il comando" },
      { letter: "e", text: "Dipende dalla giornata" }
    ]
  },
  {
    number: 5,
    text: "Il tuo stile di lotta viene criticato:",
    options: [
      { letter: "a", text: "Rispondo attaccando" },
      { letter: "b", text: "Ci resto malissimo" },
      { letter: "c", text: "Valuto con calma se è utile" },
      { letter: "d", text: "Penso che siano invidiosi" },
      { letter: "e", text: "Cambio strategia per evitare tensioni" }
    ]
  },
  {
    number: 6,
    text: "Come ti descriverebbe il tuo Pokémon starter?",
    options: [
      { letter: "a", text: "Protettivo" },
      { letter: "b", text: "Sospettoso" },
      { letter: "c", text: "Teso" },
      { letter: "d", text: "Impulsivo" },
      { letter: "e", text: "Troppo remissivo" }
    ]
  },
  {
    number: 7,
    text: "Un piano di battaglia fallisce:",
    options: [
      { letter: "a", text: "Do la colpa al compagno" },
      { letter: "b", text: "Mi agito e vado in confusione" },
      { letter: "c", text: "Analizzo e cambio strategia" },
      { letter: "d", text: "Impongo la mia idea con forza" },
      { letter: "e", text: "Spero che il problema si risolva da solo" }
    ]
  },
  {
    number: 8,
    text: "Gli altri allenatori ti vedono come:",
    options: [
      { letter: "a", text: "Gentile come un Chansey" },
      { letter: "b", text: "Freddo come un Umbreon" },
      { letter: "c", text: "Ansioso come un Psyduck" },
      { letter: "d", text: "Autoritario come un Charizard" },
      { letter: "e", text: "Disponibile come un Eevee" }
    ]
  },
  {
    number: 9,
    text: "Il mondo delle lotte Pokémon è per te:",
    options: [
      { letter: "a", text: "Ingiusto e pieno di rivalità" },
      { letter: "b", text: "Un luogo da proteggere" },
      { letter: "c", text: "Pieno di minacce" },
      { letter: "d", text: "Una giungla dove vince il più forte" },
      { letter: "e", text: "Troppo complicato" }
    ]
  },
  {
    number: 10,
    text: "Il tuo difetto principale come allenatore:",
    options: [
      { letter: "a", text: "Non mi fido degli altri" },
      { letter: "b", text: "Mi preoccupo troppo delle sconfitte" },
      { letter: "c", text: "A volte sono troppo duro" },
      { letter: "d", text: "Mi annullo per la squadra" },
      { letter: "e", text: "Sono troppo emotivo" }
    ]
  }
];

export default function QuestionnairePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (letter) => {
    setAnswers({
      ...answers,
      [questions[currentQuestion].number]: letter
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      toast.error(`Rispondi a tutte le domande (${answeredCount}/${questions.length})`);
      return;
    }

    setLoading(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([questionNumber, answer]) => ({
        question_number: parseInt(questionNumber),
        answer: answer
      }));

      const response = await axios.post(
        `${API}/quiz/submit`,
        { answers: formattedAnswers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(response.data);
      toast.success("Questionario completato! Email inviata con i risultati.");
    } catch (error) {
      toast.error("Errore durante l'invio del questionario");
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    if (type.includes("Buio")) return "buio";
    if (type.includes("Folletto")) return "folletto";
    if (type.includes("Psico")) return "psico";
    if (type.includes("Fuoco")) return "fuoco";
    if (type.includes("Normale")) return "normale";
    if (type.includes("Acciaio")) return "acciaio";
    return "acciaio";
  };

  // Result Screen - Now just shows confirmation, not the actual result
  if (result) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Confirmation Card */}
          <div className="questionnaire-bg p-8 relative animate-fade-in">
            {/* Pokeball Top */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <div className="pokeball"></div>
            </div>

            {/* Content */}
            <div className="pt-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h1 
                data-testid="result-title"
                className="font-cinzel text-2xl text-[#2C3E50] mb-4"
              >
                Questionario Completato!
              </h1>
              
              <p className="font-lato text-[#2C3E50] mb-2">
                Le tue risposte sono state registrate con successo.
              </p>
              
              <p className="font-lato text-gray-600 mb-8">
                I risultati della valutazione sono stati inviati all'Accademia e riceverai una comunicazione ufficiale via email.
              </p>

              <div className="border-t border-[#D4AF37]/30 pt-6">
                <p className="font-courier text-xs text-gray-400 mb-6">
                  Grazie per aver completato la valutazione della Commissione
                </p>

                <Button
                  data-testid="back-to-dashboard-btn"
                  onClick={() => navigate("/dashboard")}
                  className="btn-academy"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Torna alla Bacheca
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Screen
  const question = questions[currentQuestion];
  const currentAnswer = answers[question.number];

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4">
      {/* Back Button */}
      <div className="max-w-3xl mx-auto mb-6">
        <button
          data-testid="back-to-dashboard-link"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-[#2C3E50] hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-lato">Torna alla Bacheca</span>
        </button>
      </div>

      {/* Questionnaire Container */}
      <div className="max-w-5xl mx-auto">
        <div className="questionnaire-bg p-8 relative">
          {/* Pokeball Top */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <div className="pokeball"></div>
          </div>

          {/* Header */}
          <div className="pt-6 mb-8 text-center">
            <h1 
              data-testid="questionnaire-title"
              className="font-cinzel text-2xl text-[#2C3E50] mb-2"
            >
              Questionario sulla Personalità
            </h1>
            <p className="font-courier text-xs text-gray-500">
              DOCUMENTO UFFICIALE DELL'ACCADEMIA
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="font-lato text-sm text-gray-500">
                Domanda {currentQuestion + 1} di {questions.length}
              </span>
              <span className="font-courier text-sm text-[#D4AF37]">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question */}
          <div className="mb-8 animate-fade-in" key={question.number}>
            <h2 
              data-testid={`question-${question.number}`}
              className="font-cinzel text-xl text-[#2C3E50] mb-6"
            >
              {question.number}. {question.text}
            </h2>

            <div className="space-y-3">
              {question.options.map((option) => (
                <button
                  key={option.letter}
                  data-testid={`option-${question.number}-${option.letter}`}
                  onClick={() => handleAnswer(option.letter)}
                  className={`quiz-option ${currentAnswer === option.letter ? "selected" : ""}`}
                >
                  <span className="font-cinzel text-[#C0392B] mr-3">
                    {option.letter.toUpperCase()})
                  </span>
                  <span className="font-lato">{option.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-[#D4AF37]/30">
            <Button
              data-testid="prev-question-btn"
              variant="outline"
              onClick={handlePrev}
              disabled={currentQuestion === 0}
              className="border-[#2C3E50] text-[#2C3E50] hover:bg-[#2C3E50] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Precedente
            </Button>

            {currentQuestion === questions.length - 1 ? (
              <Button
                data-testid="submit-quiz-btn"
                onClick={handleSubmit}
                disabled={loading || Object.keys(answers).length < questions.length}
                className="btn-academy"
              >
                {loading ? (
                  "Invio in corso..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Invia Questionario
                  </>
                )}
              </Button>
            ) : (
              <Button
                data-testid="next-question-btn"
                onClick={handleNext}
                disabled={!currentAnswer}
                className="btn-academy"
              >
                Successiva
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-8"></div>
    </div>
  );
}
