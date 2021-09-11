from ..audio_parameters import AudioParameters

class CustomQualityAudio(AudioParameters):
    def __init__(
        self,
        bitrate: int
        ):
        super().__init__(
            bitrate,
        )
