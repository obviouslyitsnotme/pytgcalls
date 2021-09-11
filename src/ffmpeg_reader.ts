import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import {EventEmitter} from "events";

export class FFmpegReader extends EventEmitter {
    private fifo_reader?: ChildProcessWithoutNullStreams;
    private total_size: number = 0;
    private bytes_read: Buffer;
    private MAX_READ_BUFFER: number = 65536;
    private MAX_SIZE_BUFFERED: number = 24 * this.MAX_READ_BUFFER;
    private paused: boolean = true;
    private stopped: boolean = false;
    private almostFinished: boolean = false;

    constructor() {
        super();
        this.bytes_read = Buffer.alloc(0);
    }
    public convert_audio(path: string, bitrate: string){
        this.start_conversion([
            '-i',
            path.replace('fifo://', ''),
            '-f',
            's16le',
            '-ac',
            '1',
            '-ar',
            bitrate,
            'pipe:1',
        ]);
    }
    public convert_video(path: string, resolution: string, height: string, framerate: string){
        this.start_conversion([
            '-i',
            path.replace('fifo://', ''),
            '-f',
            'rawvideo',
            '-r',
            framerate,
            '-vf',
            'scale=' + resolution + ':' + height ,
            'pipe:1',
        ]);
    }
    private start_conversion(params: Array<string>) {
        this.fifo_reader = spawn('ffmpeg', params);
        this.fifo_reader.stdout.on('data', this.dataListener);
        this.fifo_reader.on('close', this.endListener);
        this.processBytes();
    }
    private dataListener = (async (chunk: any) => {
        this.total_size += chunk.length;
        this.bytes_read = Buffer.concat([this.bytes_read, chunk]);
        if(this.bytes_read.length >= this.MAX_SIZE_BUFFERED){
            this.fifo_reader?.stdout.pause();
        }
    });
    private endListener = (async () => {
        this.almostFinished = true;
    });
    private processBytes(){
        if(this.stopped){
            return;
        }
        if(!this.paused){
            if(this.bytes_read.length > 0){
                if(this.bytes_read.length < this.MAX_SIZE_BUFFERED){
                    this.fifo_reader?.stdout.resume();
                }
                const buffer_length = this.bytes_read.length < this.MAX_READ_BUFFER ? this.bytes_read.length:this.MAX_READ_BUFFER;
                const buffer = this.bytes_read.slice(0, buffer_length);
                this.emit('data', buffer);
                this.bytes_read = this.bytes_read.slice(buffer_length);
            }else if(this.almostFinished){
                this.emit('end')
                this.fifo_reader?.kill()
                return;
            }
        }
        setTimeout(
            async () => this.processBytes(),
            1,
        );
    }
    public pause(){
        this.paused = true;
    }
    public resume(){
        this.paused = false;
    }
    public fileSize(){
        return this.total_size;
    }
    public stop(){
        this.fifo_reader?.stdout.removeListener('data', this.dataListener);
        this.fifo_reader?.removeListener('close', this.endListener);
        this.stopped = true;
        this.fifo_reader?.kill()
    }
}
