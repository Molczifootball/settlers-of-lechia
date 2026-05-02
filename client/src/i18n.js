import { loadSettings } from './settings';

const PL = {
  title: 'Osadnicy z Lechii',
  tagline: 'Strategiczna gra wieloosobowa w stylu Catana',
  resources: { wood:'drewno', brick:'cegła', sheep:'owca', wheat:'pszenica', ore:'kamień', desert:'pustkowie' },
  buildings: { road:'Trakt', settlement:'Osada', city:'Gród', devCard:'Karta Rozwoju' },
  devCards: {
    knight:'Rycerz', vp:'Punkt Zwycięstwa',
    roadBuilding:'Budowa Traktów', yearOfPlenty:'Rok Obfitości', monopoly:'Monopol',
  },
  actions: {
    rollDice:'Rzuć Kośćmi', endTurn:'Zakończ Turę', build:'Buduj', buyDev:'Kup Kartę',
    trade:'Handel', bankTrade:'Bank', cancel:'Anuluj', confirm:'Potwierdź',
    accept:'Akceptuj', reject:'Odrzuć', addBot:'Dodaj Bota', start:'Rozpocznij Grę',
    create:'Stwórz Pokój', join:'Dołącz', back:'Wstecz', settings:'Ustawienia',
    send:'Wyślij',
  },
  labels: {
    yourName:'Twoje Imię', roomCode:'Kod Pokoju', players:'Gracze',
    currentTurn:'Aktualna Tura', round:'Runda', setup:'Przygotowanie',
    mainPhase:'Faza Główna', victoryPoints:'Punkty Zwycięstwa',
    knights:'Rycerze', longestRoad:'Najdłuższy Trakt', largestArmy:'Największa Armia',
    gameLog:'Dziennik Gry', ports:'Porty', bank:'Bank',
    give:'Daję', want:'Chcę', to:'Do', everyone:'Wszystkich',
    chat:'Czat', language:'Język', sound:'Dźwięki', animations:'Animacje',
    colorblind:'Tryb Daltonisty', yourHand:'Twoja Ręka', or:'lub',
    viewMode:'Widok', viewFlat:'Płaski', viewIso:'Izometryczny',
  },
  msgs: {
    placeSettlement:'Wybierz miejsce na osadę',
    placeCity:'Kliknij swoją osadę aby ją ulepszyć',
    placeRoad:'Wybierz krawędź dla traktu',
    moveRobberPrompt:'Kliknij pole aby przenieść zbójcę',
    mustDiscard:'Musisz odrzucić %d kart',
    stealFrom:'Od kogo ukraść?',
    noOneToSteal:'Brak graczy do okradzenia',
    yourTurn:'Twoja tura!',
    waitingFor:'Czekam na: %s',
    youWin:'🏆 Zwycięstwo!',
    backToLobby:'Wróć do Lobby',
    spectator:'Tryb Obserwatora',
    languageChangeReload:'Język zmieni się po przeładowaniu strony.',
    typeMessage:'Napisz wiadomość...',
    noChat:'Brak wiadomości. Powiedz coś!',
    endTurnWarn:'Czy na pewno zakończyć turę?',
    canAfford:'Stać Cię na: %s',
    havePlayableDev:'Masz %d grywalnych kart rozwoju',
  },
};

const EN = {
  title: 'Settlers of Lechia',
  tagline: 'A Catan-inspired multiplayer strategy game',
  resources: { wood:'wood', brick:'brick', sheep:'sheep', wheat:'wheat', ore:'ore', desert:'desert' },
  buildings: { road:'Road', settlement:'Settlement', city:'City', devCard:'Dev Card' },
  devCards: {
    knight:'Knight', vp:'Victory Point',
    roadBuilding:'Road Building', yearOfPlenty:'Year of Plenty', monopoly:'Monopoly',
  },
  actions: {
    rollDice:'Roll Dice', endTurn:'End Turn', build:'Build', buyDev:'Buy Card',
    trade:'Trade', bankTrade:'Bank', cancel:'Cancel', confirm:'Confirm',
    accept:'Accept', reject:'Reject', addBot:'Add Bot', start:'Start Game',
    create:'Create Room', join:'Join Room', back:'Back', settings:'Settings',
    send:'Send',
  },
  labels: {
    yourName:'Your Name', roomCode:'Room Code', players:'Players',
    currentTurn:'Current Turn', round:'Round', setup:'Setup',
    mainPhase:'Main Phase', victoryPoints:'Victory Points',
    knights:'Knights', longestRoad:'Longest Road', largestArmy:'Largest Army',
    gameLog:'Game Log', ports:'Ports', bank:'Bank',
    give:'Give', want:'Want', to:'To', everyone:'Everyone',
    chat:'Chat', language:'Language', sound:'Sound', animations:'Animations',
    colorblind:'Color-blind Mode', yourHand:'Your Hand', or:'or',
    viewMode:'Board View', viewFlat:'Flat', viewIso:'Isometric',
  },
  msgs: {
    placeSettlement:'Click a vertex to place a settlement',
    placeCity:'Click your settlement to upgrade it',
    placeRoad:'Click an edge to place a road',
    moveRobberPrompt:'Click a tile to move the robber',
    mustDiscard:'You must discard %d cards',
    stealFrom:'Steal from whom?',
    noOneToSteal:'No players to steal from',
    yourTurn:'Your turn!',
    waitingFor:'Waiting for: %s',
    youWin:'🏆 Victory!',
    backToLobby:'Back to Lobby',
    spectator:'Spectator Mode',
    languageChangeReload:'Language will change after page reload.',
    typeMessage:'Type a message...',
    noChat:'No messages yet. Say something!',
    endTurnWarn:'Are you sure you want to end your turn?',
    canAfford:'You can afford: %s',
    havePlayableDev:'You have %d playable dev card(s)',
  },
};

const STRINGS = { pl: PL, en: EN };
const lang = (loadSettings().lang === 'en') ? 'en' : 'pl';

export const T = STRINGS[lang];
export const RES_NAMES = T.resources;
