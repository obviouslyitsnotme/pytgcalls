from ..video_parameters import VideoParameters


class CustomQualityVideo(VideoParameters):
    def __init__(
        self,
        width: int,
        height: int,
        fps: int,
        ):
        super().__init__(
            width,
            height,
            fps
        )