/**
 * Ayaan's real resume — the base template for Resume Studio and the reference
 * document for the visual editor's macro conventions (\resumeSubheading,
 * \resumeProjectHeading, \resumeItem, skills itemize rows).
 * Kept in String.raw so LaTeX backslashes survive verbatim.
 */
export const AYAAN_BASE_TEMPLATE = String.raw`%-------------------------
% Enhanced Resume in Latex
% Author : Ayaan
%------------------------

\documentclass[letterpaper,11pt]{article}
\usepackage{lmodern}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{fontawesome5}
\usepackage{multicol}
\setlength{\multicolsep}{-3.0pt}
\setlength{\columnsep}{-1pt}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% Adjust margins
\addtolength{\oddsidemargin}{-0.6in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1.19in}
\addtolength{\topmargin}{-.7in}
\addtolength{\textheight}{1.4in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large\bfseries
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

% Custom commands
\newcommand{\resumeItem}[1]{\item\small{#1 \vspace{-2pt}}}
\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{1.0\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & \textbf{\small #2} \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}
\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{1.001\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & \textbf{\small #2}\\
    \end{tabular*}\vspace{-7pt}
}
\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.0in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\begin{document}

%----------HEADER----------
\begin{center}
    {\Huge \scshape Ayaan Ansari} \\ \vspace{1pt}
    Mobile Android Developer \\ \vspace{1pt}
    Mumbai, Maharashtra \\ \vspace{1pt}
    \small \faPhone\ 626-899-3859 ~
    \href{mailto:ayaan35200@gmail.com}{\faEnvelope\ ayaan35200@gmail.com} ~
    \href{https://www.linkedin.com/in/aiyu/}{\faLinkedin\ linkedin.com/in/aiyu} ~
    \href{https://github.com/aiyu-ayaan}{\faGithub\ github.com/aiyu-ayaan}
    \vspace{-8pt}
\end{center}

%-----------PROFESSIONAL SUMMARY-----------
\section{Professional Summary}
\begin{itemize}[leftmargin=0.15in, label={}]
  \small{\item{
    Work with C\#, Azure Functions, API Management (APIM), and .NET Core, with experience handling real client projects. Currently working at Adrosonic, managing two client projects and delivering scalable backend solutions. Android Developer with 2+ years of experience building innovative mobile applications using Kotlin and Jetpack Compose. Proven track record of implementing responsive UIs, integrating APIs, and delivering user-focused solutions. Passionate about creating high-performance, scalable mobile experiences with modern architecture patterns.
  }}
\end{itemize}

%-----------EXPERIENCE-----------
\section{Professional Experience}
\resumeSubHeadingListStart
  \resumeSubheading
    {Adrosonic}{Jun 2025 -- Present}
    {Software Engineer}{Mumbai, Maharashtra}
    \resumeItemListStart
      \resumeItem{Developing enterprise-level applications using \textbf{WordPress} and \textbf{.NET Framework} for client-focused solutions.}
      \resumeItem{Building scalable web applications with modern backend technologies, contributing to improved system performance by 30\%.}
      \resumeItem{Collaborating with cross-functional teams to deliver high-quality software solutions within project timelines.}
    \resumeItemListEnd

  \resumeSubheading
    {Adrosonic}{Dec 2024 -- Jun 2025}
    {Software Engineer (Trainee) - Internship}{Mumbai, Maharashtra}
    \resumeItemListStart
      \resumeItem{Developed an enterprise-level \textbf{Proof of Concept (POC)} for Dynamics 365 and Instanda integration, reducing process automation time by 40\%.}
      \resumeItem{Gained hands-on experience with \textbf{WordPress development} and \textbf{.NET Framework} for web application development.}
      \resumeItem{Redesigned office website UI/UX with responsive design principles, resulting in 30\% improved load times and 20\% increased user engagement.}
    \resumeItemListEnd

  \resumeSubheading
    {BeyondSchool}{Jul 2022 -- Mar 2023}
    {Android Developer Intern}{Ranchi, Jharkhand}
    \resumeItemListStart
      \resumeItem{Implemented \textbf{Text-to-Speech} and \textbf{Speech-to-Text} functionality that increased app accessibility and user engagement by 35\%.}
      \resumeItem{Designed and integrated \textbf{gamification features} with rewards system and leaderboards that boosted user retention by 40\%.}
      \resumeItem{Collaborated with UX team to optimize app flow, reducing user drop-off rates by 25\% and increasing session duration by 15\%.}
    \resumeItemListEnd
\resumeSubHeadingListEnd

%-----------EDUCATION-----------
\section{Education}
\resumeSubHeadingListStart
  \resumeSubheading
    {Birla Institute of Technology, Mesra}{Aug 2023 -- May 2025}
    {Master of Computer Applications}{CGPA: 8.1/10.0}
  \resumeSubheading
    {Birla Institute of Technology, Mesra}{Aug 2019 -- May 2022}
    {Bachelor of Computer Applications}{CGPA: 8.2/10.0}
\resumeSubHeadingListEnd

%-----------PROJECTS-----------
\section{Projects}
\resumeSubHeadingListStart

  \resumeProjectHeading
    {\textbf{ExpenseSync} $|$ \emph{Kotlin, Jetpack Compose, Firebase, Koin, MVVM}}{Dec 2024 -- May 2025}
    \resumeItemListStart
      \resumeItem{Architected with \textbf{MVVM}, \textbf{Clean Architecture}, and \textbf{Repository Pattern} for maintainable, testable code.}
      \resumeItem{Implemented real-time data synchronization with \textbf{Firebase Firestore} reducing sync delays by 75\%.}
      \resumeItem{Created desktop version with WhatsApp Web-style QR authentication, increasing multi-device usage by 45\%.}
    \resumeItemListEnd

  \resumeProjectHeading
    {\textbf{Research Hub} $|$ \emph{Kotlin Multiplatform, Compose, Koin, Retrofit}}{Jun 2024 -- Dec 2024}
    \resumeItemListStart
      \resumeItem{Built a cross-platform research collaboration tool that increased team productivity by 30\%.}
      \resumeItem{Implemented \textbf{Kotlin Multiplatform} for shared business logic between Android and Desktop platforms.}
      \resumeItem{Utilized \textbf{Kotlin Flow} and \textbf{Coroutines} for reactive state management and asynchronous operations.}
      \resumeItem{Integrated push notifications with \textbf{Firebase Cloud Messaging}, improving user engagement by 40\%.}
    \resumeItemListEnd

  \resumeProjectHeading
    {\textbf{BIT App} $|$ \emph{Android, Kotlin, Firebase, MVVM}}{Aug 2021 -- Present}
    \resumeItemListStart
      \resumeItem{Created and maintain an app used by \textbf{1000+ university students} with 4.7/5 rating on Google Play Store.}
      \resumeItem{Utilized \textbf{WorkManager} for background tasks and \textbf{Room} database for efficient local data storage.}
      \resumeItem{Implemented custom analytics dashboard to monitor usage patterns and inform feature development.}
    \resumeItemListEnd

  \resumeProjectHeading
    {\textbf{TTS-Engine} $|$ \emph{Android Library, Kotlin}}{Feb 2023}
    \resumeItemListStart
      \resumeItem{Designed a custom Text-to-Speech library with real-time text highlighting and lifecycle-aware functionality.}
      \resumeItem{Published to JitPack with 500+ downloads and integration in 5+ production applications.}
    \resumeItemListEnd

\resumeSubHeadingListEnd

%-----------TECHNICAL SKILLS-----------
\section{Technical Skills}
\begin{itemize}[leftmargin=0.15in, label={}]
  \small{\item{
    \textbf{Languages}{: Kotlin (Advanced), Java (Intermediate), Python (Intermediate), C\# (Basic), JavaScript (Basic)} \\
    \textbf{Android Development}{: Jetpack Compose, MVVM, Navigation, Room, WorkManager, LiveData, Flow, Coroutines} \\
    \textbf{Backend \& Cloud}{: Firebase (Authentication, Firestore, FCM), RESTful APIs, .NET Framework} \\
    \textbf{Web Development}{: WordPress Development, Responsive Design} \\
    \textbf{Tools \& DevOps}{: Android Studio, Git, GitHub Actions, Figma, Postman} \\
    \textbf{Architecture Patterns}{: Clean Architecture, MVVM, Repository Pattern, Dependency Injection (Koin, Hilt)}
  }}
\end{itemize}

\end{document}
`;
