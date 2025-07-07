import { Component,Input,Output,EventEmitter,OnChanges,SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-child',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './child.html',
  styleUrls: ['./child.scss']
})

export class ChildComponent implements OnChanges{
@Input() name: string =''
@Input() address: string =''
@Input() email: string =''

@Output() childMessage = new EventEmitter<string>();

    ngOnChanges(changes: SimpleChanges): void {

        if(changes['name']||changes['address']||changes['email']){
            if(this.name && this.address && this.email){
                this.childMessage.emit("I am Child - I got the data")
            }
        }
      
    }

}