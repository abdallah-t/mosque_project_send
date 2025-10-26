const IslamicQuote = () => {
  return (
    <div className="bg-gradient-prayer backdrop-blur-sm rounded-2xl p-8 border border-primary/30 shadow-prayer">
      <div className="text-center space-y-4">
        <div className="text-3xl font-bold text-accent leading-relaxed">
          حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ
        </div>
        <div className="text-2xl text-foreground leading-relaxed">
          عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ
        </div>
        <div className="text-lg text-muted-foreground italic mt-6">
          "Allah is sufficient for me; there is no deity except Him.<br />
          I have relied upon Him, and He is the Lord of the Great Throne."
        </div>
      </div>
    </div>
  );
};

export default IslamicQuote;
