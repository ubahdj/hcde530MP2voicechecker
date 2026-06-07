# hcde530MP2voicechecker
MP2 project 
# VoiceCheck

VoiceCheck is a web application for public health evaluators that flags moments where participant voices have been paraphrased into academic language during qualitative data synthesis. When evaluators synthesize interview notes by hand, the words participants actually used often get quietly rewritten into cleaner, more formal language — stripping out the meaning that made them valuable. VoiceCheck catches those moments before findings are finalized.

## Who it is for

Public health evaluators working with low-literacy and non-English speaking populations whose voices need to be accurately represented in program findings submitted to funders, policy makers, or health departments.

## How to use it

No installation required. Access the live tool here:

https://voicecheck-truth-teller.lovable.app

Upload your evaluation notes as a PDF, Word doc, or text file. The tool will analyze the document and highlight flagged passages. Review each flag one by one, enter the original participant quote for comparison, and accept or dismiss each flag. When finished, export a revision report.

## What it detects

VoiceCheck flags six patterns of voice loss:

1. First-person language shifted to third-person
2. Hesitation and uncertainty flattened into declarative claims
3. Informal or emotional language replaced with clinical terms
4. Specific details replaced with generalizations
5. Emotion or fear removed and replaced with neutral framing
6. Culturally specific phrasing standardized into clinical equivalents

## Built with

- Lovable — frontend and deployment
- Supabase — storage and sessions
- Claude API — flagging logic
